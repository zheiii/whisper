export const Footer = () => {
  return (
    <div className="flex flex-col md:flex-row justify-between gap-2 px-4 py-[9px] items-center">
      <p className="text-xs text-center">
        <span className="text-xs text-center text-[#99a1af]">Powered by </span>
        <a
          target="_blank"
          rel="noopenner"
          href="https://togetherai.link/"
          className="text-xs text-center text-[#364153]"
        >
          Whisper
        </a>
        <span className="text-xs text-center text-[#99a1af]"> on </span>
        <a
          target="_blank"
          rel="noopenner"
          href="https://togetherai.link/"
          className="text-xs text-center text-[#364153]"
        >
          Together.ai
        </a>
      </p>

      <div className="flex flex-row gap-2">
        <a
          href="https://github.com/nutlope/whisper-app"
          target="_blank"
          rel="noopenner"
        >
          <img src="/github.svg" alt="GitHub" className="h-5 w-5" />
        </a>
        <a href="https://x.com/nutlope" target="_blank" rel="noopenner">
          <img src="/twitter.svg" alt="Twitter" className="h-5 w-5" />
        </a>
      </div>
    </div>
  );
};
