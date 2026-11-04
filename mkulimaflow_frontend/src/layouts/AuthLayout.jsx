import Brand from '../components/common/Brand'
import { UserGroup} from 'lucide-react';

export default function AuthLayout({ eyebrow, title, description, children, footer }) {
  return (
    <main className="mx-auto my-[42px] grid min-h-[690px] w-[min(1200px,calc(100%-64px))] grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] overflow-hidden rounded-[22px] border border-[#e8e7dd] bg-white shadow-[0_18px_60px_rgba(38,49,35,0.07)] max-md:my-4 max-md:w-[calc(100%-28px)] max-md:grid-cols-1">
     <section className="relative min-h-[690px] overflow-hidden bg-cover bg-center text-white max-md:hidden bg-[url('/images/signup.png')]">        
        <div className="absolute inset-0 bg-black/40" />

        
        
        <div className="relative z-[1] flex min-h-[690px] flex-col p-[39px_42px] max-lg:p-8">
          <Brand />
          <div className="mt-[85px] w-[min(390px,100%)]">
            <span className="text-[20px] font-extrabold tracking-[px] text-[#bdd298]">GROW TOGETHER</span>
            <h1 className="mb-[15px] mt-[17px] font-display text-[clamp(36px,4vw,52px)] font-semibold leading-[1.08] tracking-[-2.2px] text-white">
              Good things grow when we connect.
            </h1>
            <p className="max-w-[345px] text-[15px] leading-[1.8] text-white/75">
              A simpler way for farmers and buyers to find each other and move agriculture forward.
            </p>
          </div>
          <div className="mt-auto flex items-center gap-[11px] text-xs text-white/75">
            <span className="text-xl text-[#c8d99e]" aria-hidden="true"><UserGroup /></span>
            <span>Rooted in community. Made for what is next.</span>
          </div>
        </div>

        <div className="pointer-events-none absolute -bottom-[110px] -left-[10%] h-[170px] w-[120%] rotate-[-6deg] rounded-[50%_50%_0_0] border border-white/20 bg-[#78905b]/40 backdrop-blur-xs" />
        <div className="pointer-events-none absolute -bottom-[111px] -left-[10%] h-[163px] w-[120%] rotate-[4deg] rounded-[50%_50%_0_0] border border-white/20 bg-[#5e794b]/40 backdrop-blur-xs" />
        <div className="pointer-events-none absolute -bottom-[146px] -left-[10%] h-[164px] w-[120%] rotate-[-3deg] rounded-[50%_50%_0_0] border border-white/20 bg-[#425f3e]/40 backdrop-blur-xs" />
        
      </section>

      <section className="flex items-center justify-center px-[50px] py-14 max-lg:px-8 max-md:px-6 max-md:py-8 max-[410px]:px-[17px]">
        <div className="w-full max-w-[430px]">
          <div className="mb-7 hidden max-md:block">
            <Brand compact />
          </div>
          <div className="mb-[25px]">
            <span className="inline-block text-[10px] font-extrabold tracking-[1.75px] text-[#73886e]">{eyebrow}</span>
            <h2 className="mb-2 mt-[9px] font-display text-[34px] font-semibold leading-[1.15] tracking-[-1.35px] text-[#252d25] max-md:text-[30px]">
              {title}
            </h2>
            <p className="text-[13px] leading-[1.65] text-[#7d8479]">{description}</p>
          </div>
          {children}
          <div className="mt-[21px] text-center text-xs text-[#747a70]">{footer}</div>
          <p className="mt-[30px] text-center text-[10px] text-[#969b91]">
            Your account is protected with secure, encrypted sign-in.
          </p>
        </div>
      </section>
    </main>
  )
}