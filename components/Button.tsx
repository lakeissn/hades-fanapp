type ButtonProps = {
  children: React.ReactNode;
  href?: string;
};

export default function Button({ children, href }: ButtonProps) {
  const className = "button";
  if (href) {
    return (
      <a className={className} href={href}>
        {children}
      </a>
    );
  }
  return <button className={className}>{children}</button>;
}
