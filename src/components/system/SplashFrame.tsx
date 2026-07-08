/* eslint-disable @next/next/no-img-element */

export function SplashFrame({
  className = "",
  exiting = false,
}: {
  className?: string;
  exiting?: boolean;
}) {
  return (
    <div
      className={[
        "grid h-dvh max-h-dvh w-screen max-w-full place-items-center overflow-hidden bg-black px-8",
        exiting ? "splash-screen-exit" : "",
        className,
      ].join(" ")}
    >
      <div className="splash-content grid w-full max-w-5xl gap-7">
        <span className=" mx-auto block w-[60%] lg:w-[30%]">
          <img
            alt="Dink Lab"
            className="splash-logo h-auto w-full"
            src="/test.png"
          />
        </span>
        <div className="mx-auto w-full max-w-xs">
          <div className="h-[3px] md:h-[7px] overflow-hidden rounded-full bg-white/12">
            <div className="splash-loading-line  rounded-full h-full bg-white" />
          </div>
          <p className="mt-3 text-center font-display text-[0.65rem] font-black uppercase tracking-[0.32em] text-zinc-500">
            <span className="splash-loading-text inline-block overflow-hidden whitespace-nowrap md:text-lg ">
              Loading...
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
