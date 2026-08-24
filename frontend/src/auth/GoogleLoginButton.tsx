import { GoogleLogin } from "@react-oauth/google";

interface GoogleLoginButtonProps {
  loginWithGoogleIdToken: (token: string) => Promise<void>;
}

export function GoogleLoginButton({ loginWithGoogleIdToken }: Readonly<GoogleLoginButtonProps>) {
  return (
    <div style={{ colorScheme: "light" }}>
      <GoogleLogin
        onSuccess={(credentialResponse) => {
          const token = credentialResponse.credential;
          if (token) {
            loginWithGoogleIdToken(token).catch((err) => {
              console.error("Google login failed", err);
            });
          }
        }}
        onError={() => console.error("Google login failed")}
        size="medium"
        theme="filled_blue"
        useOneTap
        auto_select
      />
    </div>
  );
}
