import ChatApp from "@/components/ChatApp";
import { requireUser } from "@/lib/dal";

export default async function ChatPage() {
  // The real gate. requireUser() has FastAPI verify the token and load the
  // account, so an expired or forged cookie cannot get past it.
  const user = await requireUser();

  return (
    <ChatApp
      user={{
        name: user.name,
        email: user.email,
        defaultCaseType: user.default_case_type,
        defaultState: user.default_state,
      }}
    />
  );
}