"use client";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Map, ClipboardCheck, Settings } from "lucide-react";
import Image from "next/image";
import { APP_LABELS, APP_DESCRIPTIONS, APP_REQUIRES_ADMIN, getPrimaryApps, type AppKey } from "@/types/app";
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
  const [mockPersona, setMockPersona] = useState<string>('')
  
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
    const username = mockPersona || roleSelection
    signIn('credentials', {
      callbackUrl: `${resolvedCallbackUrl}?appSelection=${app}`,
      username,
      roleSelection,
      appSelection: app,
    });
  };

  const primaryApps = getPrimaryApps()

  return (
    <div className="w-full max-w-4xl space-y-8">
      {/* Header */}
      <div className="text-center text-white">
        <h1 className="text-4xl font-bold mb-2">SEEE Expedition Dashboard</h1>
        <p className="text-lg text-white/80">Select an application to continue</p>
      </div>
      
      {/* 3-Card App Selection */}
      <div
        className={`grid w-full gap-6 justify-center ${
          primaryApps.length === 1
            ? 'grid-cols-1 max-w-md mx-auto'
            : primaryApps.length === 2
            ? 'grid-cols-1 md:grid-cols-2 md:max-w-3xl mx-auto'
            : 'grid-cols-1 md:grid-cols-3'
        }`}
      >
        {primaryApps.map((app) => (
          <Card 
            key={app}
            className={`cursor-pointer transition-all hover:shadow-xl hover:scale-105 flex flex-col ${
              selectedApp === app ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => handleAppSelect(app)}
          >
            <CardHeader className="text-center pb-2 flex-1">
              <div className="mx-auto w-full rounded-lg bg-muted px-4 py-3 flex items-center justify-center gap-3">
                <div className="p-3 rounded-full bg-background text-primary">
                  {APP_ICONS[app]}
                </div>
                <CardTitle className="text-lg">{APP_LABELS[app]}</CardTitle>
              </div>
              <CardDescription className="text-sm mt-3">
                {APP_DESCRIPTIONS[app]}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 mt-auto">
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
            <div className="space-y-1">
              <label htmlFor="mockPersona" className="text-xs text-yellow-800">
                Mock persona (optional)
              </label>
              <select
                id="mockPersona"
                value={mockPersona}
                onChange={(e) => setMockPersona(e.target.value)}
                className="w-full rounded-md border border-yellow-200 bg-white px-2 py-1 text-xs"
              >
                <option value="">Auto (admin/standard)</option>
                <option value="noSeeeElevatedOther">No SEEE / Elevated Other</option>
                <option value="seeeEventsOnlyRestrictedOther">SEEE Events Only / Restricted Other</option>
                <option value="seeeFullOnly">SEEE Full Only</option>
                <option value="seeeFullElevatedOther">SEEE Full / Elevated Other</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              {primaryApps.map((app) => (
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
