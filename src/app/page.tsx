"use client";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Map, ClipboardCheck, Settings } from "lucide-react";
import Image from "next/image";
import { APP_LABELS, APP_DESCRIPTIONS, APP_REQUIRES_ADMIN, PRIMARY_APPS, type AppKey } from "@/types/app";
import { getDefaultPathForApp, getRequiredAppForPath } from "@/lib/app-route-guards";

/**
 * App card configuration for the 3-card layout
 */
const APP_ICONS: Record<AppKey, React.ReactNode> = {
  expedition: <Eye className="h-8 w-8" />,
  planning: <Map className="h-8 w-8" />,
  'data-quality': <ClipboardCheck className="h-8 w-8" />,
  'platform-admin': <Settings className="h-6 w-6" />,
  multi: <Eye className="h-6 w-6" />,
};

/**
 * Login page content - separated to allow Suspense boundary for useSearchParams
 */
function LoginContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mockEnabled = process.env.NEXT_PUBLIC_MOCK_AUTH_ENABLED === "true" || process.env.MOCK_AUTH_ENABLED === "true";
  const [selectedApp, setSelectedApp] = useState<AppKey | null>(null);
  
  // Get callback URL from query params or default to dashboard
  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard';
  
  useEffect(() => {
    if (status === "authenticated") {
      router.push(callbackUrl);
    }
  }, [status, router, callbackUrl]);
  
  if (status === "loading" || status === "authenticated") {
    return null;
  }

  const handleAppSelect = (app: AppKey) => {
    setSelectedApp(app);
    
    // Determine OAuth provider based on app requirements
    const provider = APP_REQUIRES_ADMIN[app] ? 'osm-admin' : 'osm-standard';
    console.log('[Login] Signing in with provider:', provider, 'app:', app);
    
    const resolvedCallbackUrl = (() => {
      try {
        const requiredApp = getRequiredAppForPath(callbackUrl)
        if (requiredApp && requiredApp === app) {
          return callbackUrl
        }
      } catch {
        // ignore
      }
      return getDefaultPathForApp(app)
    })()

    signIn(provider, {
      callbackUrl: `${resolvedCallbackUrl}?appSelection=${app}`,
    });
  };
  
  const handleMockLogin = (app: AppKey) => {
    const roleSelection = APP_REQUIRES_ADMIN[app] ? 'admin' : 'standard';
    const resolvedCallbackUrl = (() => {
      try {
        const requiredApp = getRequiredAppForPath(callbackUrl)
        if (requiredApp && requiredApp === app) {
          return callbackUrl
        }
      } catch {
        // ignore
      }
      return getDefaultPathForApp(app)
    })()
    signIn('credentials', {
      callbackUrl: `${resolvedCallbackUrl}?appSelection=${app}`,
      username: roleSelection,
      roleSelection,
      appSelection: app,
    });
  };

  return (
    <div className="w-full max-w-4xl space-y-8">
      {/* Header */}
      <div className="text-center text-white">
        <h1 className="text-4xl font-bold mb-2">SEEE Expedition Dashboard</h1>
        <p className="text-lg text-white/80">Select an application to continue</p>
      </div>
      
      {/* 3-Card App Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PRIMARY_APPS.map((app) => (
          <Card 
            key={app}
            className={`cursor-pointer transition-all hover:shadow-xl hover:scale-105 ${
              selectedApp === app ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => handleAppSelect(app)}
          >
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-3 p-3 rounded-full bg-primary/10 text-primary">
                {APP_ICONS[app]}
              </div>
              <CardTitle className="text-lg">{APP_LABELS[app]}</CardTitle>
              <CardDescription className="text-sm">
                {APP_DESCRIPTIONS[app]}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xs text-center text-muted-foreground">
                {APP_REQUIRES_ADMIN[app] ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Requires admin access
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Standard access
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Platform Admin Link */}
      <div className="text-center">
        <button
          onClick={() => handleAppSelect('platform-admin')}
          className="text-sm text-white/60 hover:text-white underline-offset-4 hover:underline transition-colors"
        >
          Platform Administration
        </button>
      </div>
      
      {/* Mock Login for Development */}
      {mockEnabled && (
        <Card className="max-w-md mx-auto bg-yellow-50 border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-yellow-800">Development Mode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-yellow-700">Mock login available for testing:</p>
            <div className="flex flex-wrap gap-2">
              {PRIMARY_APPS.map((app) => (
                <Button
                  key={app}
                  variant="outline"
                  size="sm"
                  onClick={() => handleMockLogin(app)}
                  className="text-xs"
                >
                  {APP_LABELS[app]}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMockLogin('platform-admin')}
                className="text-xs"
              >
                Platform Admin
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Home page with Suspense boundary for useSearchParams
 */
export default function Home() {
  return (
    <div className="relative min-h-screen">
      {/* Hero background image */}
      <Image src="/hero.jpg" alt="Expedition hero" fill priority className="object-cover" />
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <Suspense fallback={
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xl">SEEE Expedition Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-10 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        }>
          <LoginContent />
        </Suspense>
      </div>
    </div>
  );
}
