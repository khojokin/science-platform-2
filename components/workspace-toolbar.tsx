
"use client";

import { OrganizationSwitcher } from "@clerk/nextjs";

export function WorkspaceToolbar() {
  return (
    <div className="card stack">
      <h3>Workspace identity</h3>
      <p className="muted">
        Use Clerk Organizations to switch between labs, schools, clubs, and institution workspaces.
      </p>
      <OrganizationSwitcher
        hidePersonal
        afterCreateOrganizationUrl="/workspaces"
        afterLeaveOrganizationUrl="/workspaces"
        afterSelectOrganizationUrl="/workspaces"
      />
    </div>
  );
}
