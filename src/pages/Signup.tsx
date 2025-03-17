
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { Bot, Mail, Lock, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Form validation schema
const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

const Signup = () => {
  const { signup, isLoading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  
  const onSubmit = async (data: FormValues) => {
    setError(null);
    try {
      await signup(data.email, data.password, data.name);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    }
  };
  
  return (
    <div className="flex min-h-screen bg-dark-purple">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-500 to-neon-purple items-center justify-center">
        <div className="max-w-lg p-8">
          <div className="flex items-center mb-8">
            <Bot size={48} className="text-white mr-4" />
            <h1 className="text-4xl font-bold text-white">
              <span className="text-gradient-blue">AI</span>nalyzer
            </h1>
          </div>
          <h2 className="text-3xl font-bold text-white mb-6">
            Start your journey to sales excellence
          </h2>
          <p className="text-white/80 text-lg">
            Create an account to unlock the full potential of AI-powered sales coaching and analytics.
          </p>
          
          <div className="mt-12 space-y-4">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <div key={num} className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                  {num}
                </div>
                <div className="ml-4 text-white">
                  {num === 1 && "Real-time call analysis"}
                  {num === 2 && "Sentiment tracking"}
                  {num === 3 && "Performance metrics"}
                  {num === 4 && "AI-driven coaching"}
                  {num === 5 && "Team collaboration"}
                  {num === 6 && "Integration with CRM systems"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <Card className="w-full max-w-md border-0 shadow-xl bg-black/20 backdrop-blur-md text-white">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Create account</CardTitle>
            <CardDescription className="text-gray-400">
              Sign up to get started with AInalyzer
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6 bg-red-500/10 border-red-500/50 text-red-500">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-400">Full Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
                          <Input 
                            placeholder="John Doe" 
                            className="pl-10 bg-white/5 border-white/10 text-white"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-400">Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
                          <Input 
                            placeholder="john@example.com" 
                            className="pl-10 bg-white/5 border-white/10 text-white"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-400">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
                          <Input 
                            type="password" 
                            placeholder="••••••••" 
                            className="pl-10 bg-white/5 border-white/10 text-white"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-400">Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
                          <Input 
                            type="password" 
                            placeholder="••••••••" 
                            className="pl-10 bg-white/5 border-white/10 text-white"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full bg-neon-purple hover:bg-neon-purple/90"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating account..." : "Create account"} 
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="justify-center border-t border-white/10 pt-6">
            <p className="text-gray-400 text-sm">
              Already have an account?{" "}
              <Link to="/login" className="text-neon-blue hover:underline">
                Log in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
