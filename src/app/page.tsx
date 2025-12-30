"use client";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Info } from "lucide-react";
import Image from "next/image";
import { APP_LABELS, DEFAULT_APP_FOR_ROLE, type AppKey } from "@/types/app";

type UserRoleSelection = "admin" | "standard";

/**
 * Login page content - separated to allow Suspense boundary for useSearchParams
 */
function LoginContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mockEnabled = process.env.NEXT_PUBLIC_MOCK_AUTH_ENABLED === "true" || process.env.MOCK_AUTH_ENABLED === "true";
  const [selectedRole, setSelectedRole] = useState<UserRoleSelection>("standard");
  const [selectedApp, setSelectedApp] = useState<AppKey>(DEFAULT_APP_FOR_ROLE.standard);
  const [infoOpen, setInfoOpen] = useState(false);
  
  // Update default app when role changes
  useEffect(() => {
    setSelectedApp(DEFAULT_APP_FOR_ROLE[selectedRole]);
  }, [selectedRole]);
  
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

  const handleSignIn = () => {
    // Call the appropriate OAuth provider based on role selection
    // osm-admin requests 4 scopes, osm-standard requests 1 scope
    const provider = selectedRole === 'admin' ? 'osm-admin' : 'osm-standard';
    console.log('[Login] Signing in with provider:', provider, 'app:', selectedApp);
    
    // Pass app selection through OAuth state
    signIn(provider, { 
      callbackUrl: `${callbackUrl}?appSelection=${selectedApp}`,
    });
  };
  
  // Get available apps based on role
  const availableApps: AppKey[] = selectedRole === 'admin' 
    ? ['planning', 'platform-admin'] 
    : ['expedition'];

  return (
    <Card className="w-full max-w-md shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl">OSM Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sign in to continue. Select your access level below.
            </p>
            
            {/* Role Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Access Level</Label>
              <RadioGroup value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRoleSelection)}>
                <div className="flex items-start space-x-3 space-y-0">
                  <RadioGroupItem value="standard" id="standard" />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="standard" className="font-medium cursor-pointer">
                      Standard Viewer
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      View events and attendance only
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 space-y-0">
                  <RadioGroupItem value="admin" id="admin" />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="admin" className="font-medium cursor-pointer">
                      Administrator
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Full access to all sections and members
                    </p>
                  </div>
                </div>
              </RadioGroup>
              
              {/* Collapsible Info Section */}
              <Collapsible open={infoOpen} onOpenChange={setInfoOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Info className="h-4 w-4" />
                  <span>What permissions will be requested?</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${infoOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2 text-xs text-muted-foreground border-l-2 border-muted pl-4">
                  {selectedRole === "admin" ? (
                    <>
                      <p className="font-medium">Administrator permissions:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Read events and attendance</li>
                        <li>Read member information</li>
                        <li>Read programme records</li>
                        <li>Read flexi records</li>
                      </ul>
                    </>
                  ) : (
                    <>
                      <p className="font-medium">Standard Viewer permissions:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Read events and attendance only</li>
                      </ul>
                    </>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </div>
            
            {/* App Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Application</Label>
              <RadioGroup value={selectedApp} onValueChange={(value) => setSelectedApp(value as AppKey)}>
                {availableApps.map((app) => (
                  <div key={app} className="flex items-start space-x-3 space-y-0">
                    <RadioGroupItem value={app} id={app} />
                    <div className="space-y-1 leading-none">
                      <Label htmlFor={app} className="font-medium cursor-pointer">
                        {APP_LABELS[app]}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {app === 'planning' && 'Plan and manage expedition events'}
                        {app === 'expedition' && 'View events and attendance'}
                        {app === 'platform-admin' && 'System administration and configuration'}
                      </p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Button onClick={handleSignIn} size="lg">
                Sign in with OSM
              </Button>
              {mockEnabled && (
                <Button
                  variant="secondary"
                  onClick={() =>
                    signIn('credentials', {
                      callbackUrl: `${callbackUrl}?appSelection=${selectedApp}`,
                      username: selectedRole,
                      roleSelection: selectedRole,
                      appSelection: selectedApp,
                    })
                  }
                >
                  Dev: Mock Login
                </Button>
              )}
            </div>
          </CardContent>
    </Card>
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
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
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
