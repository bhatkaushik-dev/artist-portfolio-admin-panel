import { PageHeader } from "@/components/ui/base";
import { getSiteProfile } from "@/lib/api/resources";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Profile · Portfolio Admin" };

export default async function ProfilePage() {
  const profile = await getSiteProfile();

  return (
    <>
      <PageHeader
        title="Profile"
        description="Identity, contact details and the structured data search engines read."
      />
      <ProfileForm profile={profile} />
    </>
  );
}
