
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client Secret is required"),
});

const GoogleCredentialsForm = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: '',
      clientSecret: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { 
          action: 'updateCredentials',
          clientId: values.clientId,
          clientSecret: values.clientSecret
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Credentials Updated",
        description: "Google Calendar credentials have been updated successfully.",
      });

      // Reset the form
      form.reset();
    } catch (error: any) {
      console.error('Failed to update credentials:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update Google Calendar credentials. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Update Google Calendar Credentials</CardTitle>
        <CardDescription>
          Enter your Google OAuth credentials to enable calendar integration
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client ID</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter your Google OAuth Client ID" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    The client ID from your Google Cloud Console
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clientSecret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Secret</FormLabel>
                  <FormControl>
                    <Input 
                      type="password"
                      placeholder="Enter your Google OAuth Client Secret" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    The client secret from your Google Cloud Console
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update Credentials"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
};

export default GoogleCredentialsForm;
