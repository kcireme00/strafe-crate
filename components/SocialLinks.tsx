export default function SocialLinks() {
  const links = [
    {
      label: "Discord",
      href: "https://discord.gg/bk52Sg93AK",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M19.54 5.34A16.36 16.36 0 0 0 15.44 4l-.5 1.02a15.2 15.2 0 0 0-5.87 0L8.56 4a16.7 16.7 0 0 0-4.1 1.35C1.86 9.2 1.16 12.96 1.5 16.67a16.55 16.55 0 0 0 5.03 2.54l1.23-1.67a10.84 10.84 0 0 1-1.93-.94l.47-.37a11.7 11.7 0 0 0 11.4 0l.47.37c-.62.37-1.27.69-1.94.94l1.23 1.67a16.48 16.48 0 0 0 5.03-2.54c.4-4.3-.68-8.03-2.45-11.33ZM8.33 14.4c-1.1 0-2-1.02-2-2.27s.88-2.28 2-2.28c1.13 0 2.02 1.03 2 2.28 0 1.25-.88 2.27-2 2.27Zm7.34 0c-1.1 0-2-1.02-2-2.27s.88-2.28 2-2.28c1.13 0 2.02 1.03 2 2.28 0 1.25-.87 2.27-2 2.27Z"/>
        </svg>
      ),
    },
    {
      label: "X",
      href: "https://x.com/strafecrate",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M18.9 2H22l-6.77 7.74L23.2 22h-6.24l-4.89-6.39L6.48 22H3.36l7.26-8.3L2.97 2h6.4l4.42 5.84L18.9 2Zm-1.1 17.84h1.72L8.43 4.05H6.58L17.8 19.84Z"/>
        </svg>
      ),
    },
    {
      label: "Instagram",
      href: "https://www.instagram.com/strafecrate/",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6Zm9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="social-icon-links" aria-label="Strafe Crate social links">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.label}
          title={link.label}
        >
          {link.icon}
        </a>
      ))}
    </div>
  );
}
