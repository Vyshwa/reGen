import React from 'react';

const Footer = () => {
  return (
    <footer className="w-full py-6 mt-auto text-center border-t border-border/0 bg-background/0 backdrop-blur-sm">
      <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5 font-medium tracking-wide translate-y-[1px]">
        Made with <span className="text-red-500 animate-pulse text-base leading-none">❤️</span> by <a href="https://krishub.in" target="_blank" rel="noopener noreferrer" className="text-foreground font-bold hover:text-primary transition-colors cursor-pointer underline-offset-2 hover:underline">Krishub</a>
      </p>
    </footer>
  );
};

export default Footer;
