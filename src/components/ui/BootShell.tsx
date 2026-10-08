/**
 * App chrome placeholder — blue sidebar, header, loader in the content area.
 * Same paint as the boot markup in index.html (styles live there) and the Spectrum CRM,
 * so a session/workspace check after switching apps never flashes a blank or full-screen page.
 */
export function BootShell({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="boot-shell" role="status" aria-busy="true" aria-live="polite" aria-label={label}>
      <div className="boot-side" />
      <div className="boot-main">
        <div className="boot-head" />
        <div className="boot-body">
          <div className="crm-boot-track" aria-hidden="true">
            <div className="crm-boot-bar" />
          </div>
          <div className="crm-boot-body">
            <div className="crm-boot-mark" aria-hidden="true">
              <span className="crm-boot-halo" />
              <span className="crm-boot-ring" />
              <span className="crm-boot-core">FI</span>
            </div>
            <p className="crm-boot-label">{label}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
