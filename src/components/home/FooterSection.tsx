const FooterSection = () => {
  return (
    <footer className="court-section relative py-6">
      <div className="site-container">
        <p className="text-center text-xs font-medium text-zinc-600">
          Developed by{" "}
          <a
            className="text-zinc-400 transition hover:text-white"
            href="https://andrewvillalon.online"
            rel="noreferrer"
            target="_blank"
          >
            Andrew R. Villalon
          </a>
        </p>
      </div>
    </footer>
  );
};

export default FooterSection;
