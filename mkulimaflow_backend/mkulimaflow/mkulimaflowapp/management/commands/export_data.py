import json
from io import StringIO

from django.apps import apps
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = (
        "Export users, groups and app data as a fixture ordered so that "
        "loaddata can import it into a fresh database."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "-o",
            "--output",
            required=True,
            help="Path of the JSON fixture to write.",
        )
        parser.add_argument(
            "app_labels",
            nargs="*",
            default=["mkulimaflowapp"],
            help="App labels to export app data from (default: mkulimaflowapp).",
        )

    def handle(self, *args, **options):
        labels = ["auth.user", "auth.group"]
        for app_label in options["app_labels"]:
            try:
                app_config = apps.get_app_config(app_label)
            except LookupError as error:
                raise CommandError(str(error)) from error
            labels.extend(
                model._meta.label_lower
                for model in app_config.get_models()
                if model._meta.label_lower not in labels
            )

        buffer = StringIO()
        call_command("dumpdata", *labels, indent=2, stdout=buffer)
        objects = json.loads(buffer.getvalue())
        included = {obj["model"] for obj in objects}

        dependencies = self._dependencies(included)
        ordered = self._order(included, dependencies, objects)
        objects = self._drop_missing_m2m(objects, included)

        by_model = {}
        for obj in objects:
            by_model.setdefault(obj["model"], []).append(obj)

        payload = []
        for label in ordered:
            payload.extend(by_model[label])

        self._validate(payload)

        with open(options["output"], "w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2, ensure_ascii=False)
            handle.write("\n")

        counts = {}
        for obj in payload:
            counts[obj["model"]] = counts.get(obj["model"], 0) + 1
        self.stdout.write(
            self.style.SUCCESS(
                f"Wrote {len(payload)} objects to {options['output']}"
            )
        )
        for label in ordered:
            self.stdout.write(f"  {label}: {counts.get(label, 0)}")

    def _dependencies(self, included):
        dependencies = {}
        for label in included:
            model = apps.get_model(label)
            related = set()
            for field in model._meta.get_fields():
                if field.auto_created:
                    continue
                if not (
                    field.many_to_one
                    or field.one_to_one
                    or field.many_to_many
                ):
                    continue
                related_model = getattr(field, "related_model", None)
                if related_model is None:
                    continue
                related_label = related_model._meta.label_lower
                if related_label != label and related_label in included:
                    related.add(related_label)
            dependencies[label] = related
        return dependencies

    def _order(self, included, dependencies, objects):
        first_seen = {}
        for index, obj in enumerate(objects):
            first_seen.setdefault(obj["model"], index)

        remaining = set(included)
        ordered = []
        while remaining:
            ready = sorted(
                (
                    label
                    for label in remaining
                    if not (dependencies[label] & remaining)
                ),
                key=lambda label: first_seen.get(label, 0),
            )
            if not ready:
                raise CommandError(
                    "Cannot order models with circular references: "
                    + ", ".join(sorted(remaining))
                )
            ordered.extend(ready)
            remaining.difference_update(ready)
        return ordered

    def _drop_missing_m2m(self, objects, included):
        for obj in objects:
            model = apps.get_model(obj["model"])
            for name, value in list(obj["fields"].items()):
                try:
                    field = model._meta.get_field(name)
                except Exception:
                    continue
                if not field.many_to_many:
                    continue
                related_label = field.related_model._meta.label_lower
                if related_label not in included:
                    obj["fields"][name] = []
        return objects

    def _validate(self, objects):
        seen = {}
        for obj in objects:
            label = obj["model"]
            model = apps.get_model(label)
            for name, value in obj["fields"].items():
                if value is None:
                    continue
                try:
                    field = model._meta.get_field(name)
                except Exception:
                    continue
                if not (
                    field.many_to_one
                    or field.one_to_one
                    or field.many_to_many
                ):
                    continue
                related_label = field.related_model._meta.label_lower
                if related_label == label:
                    continue
                targets = value if isinstance(value, list) else [value]
                for target in targets:
                    if target not in seen.get(related_label, set()):
                        raise CommandError(
                            f"{label}:{obj['pk']}.{name} references missing "
                            f"{related_label}:{target}"
                        )
            seen.setdefault(label, set()).add(obj["pk"])
