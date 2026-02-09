
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Employees",
  description: "Employees Management",
};

export default function EmployeesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="p-4">
      {children}
    </div>
  );
}
