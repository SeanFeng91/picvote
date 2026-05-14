import { LogoutButton } from "@/components/logout-button";
import { UploadForm } from "@/components/upload-form";
import { requireUserPage } from "@/lib/guards";
import { getWorkForUser } from "@/lib/store";

export default async function UploadPage() {
  const user = await requireUserPage("/upload");
  const currentWork = await getWorkForUser(user.id);
  return (
    <div className="page-shell stack">
      <div className="topbar">
        <div className="brand-lockup">
          <span className="eyebrow">Upload</span>
          <h1 className="headline">上传与替换作品</h1>
        </div>
        <LogoutButton />
      </div>
      <UploadForm currentWork={currentWork} canUpload={user.canUpload} />
    </div>
  );
}
