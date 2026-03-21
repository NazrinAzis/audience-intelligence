"use client";

import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface TopNavProps {
  breadcrumbs: BreadcrumbItem[];
  title: string;
  actions?: React.ReactNode;
}

export function TopNav({ breadcrumbs, title, actions }: TopNavProps) {
  return (
    <div className="bg-white border-b border-nz-border px-8 py-4">
      {/* Breadcrumb bar */}
      <div className="flex items-center gap-1.5 text-[13px] font-body text-nz-text-secondary mb-1">
        {breadcrumbs.map((item, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-nz-border-strong">/</span>}
            {item.href ? (
              <Link href={item.href} className="hover:text-nz-primary transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className={i === breadcrumbs.length - 1 ? "text-nz-text font-medium" : ""}>
                {item.label}
              </span>
            )}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-heading font-semibold text-nz-text">{title}</h1>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}
