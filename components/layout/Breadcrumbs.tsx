import type { ReactElement } from "react";

type BreadcrumbsProps = {
  items: string[];
};

export const Breadcrumbs = ({ items }: BreadcrumbsProps): ReactElement => {
  return <p className="text-sm text-muted-foreground">{items.join(" / ")}</p>;
};
