import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { detectCategory, getCategoryLabel, type SupportCategory } from '@/lib/supportHelpers';
import { useCreateTicket } from '@/hooks/useSupportTickets';
import type { Database } from '@/integrations/supabase/types';

const categories: SupportCategory[] = [
  'payment_issues',
  'technical_issues',
  'account_verification',
  'refunds_disputes',
  'general_inquiry',
  'shop_management',
  'product_issues',
];

const formSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000),
  category: z.enum([
    'payment_issues',
    'technical_issues',
    'account_verification',
    'refunds_disputes',
    'general_inquiry',
    'shop_management',
    'product_issues',
  ]),
});

interface NewTicketFormProps {
  onSuccess: (ticketId: string) => void;
}

export const NewTicketForm = ({ onSuccess }: NewTicketFormProps) => {
  const createTicket = useCreateTicket();
  const [detectedCategory, setDetectedCategory] = useState<SupportCategory | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: '',
      description: '',
      category: 'general_inquiry',
    },
  });

  const description = form.watch('description');

  // Auto-detect category from description
  useEffect(() => {
    if (description && description.length > 20) {
      const category = detectCategory(description);
      setDetectedCategory(category);
      if (!form.getValues('category') || form.getValues('category') === 'general_inquiry') {
        form.setValue('category', category);
      }
    }
  }, [description, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const ticket = await createTicket.mutateAsync({
        subject: values.subject,
        description: values.description,
        category: values.category,
        priority: 'medium',
      });

      form.reset();
      onSuccess(ticket.id);
    } catch (error) {
      console.error('Failed to create ticket:', error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <FormControl>
                <Input
                  placeholder="Brief description of your issue"
                  {...field}
                  maxLength={100}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Please provide detailed information about your issue..."
                  className="min-h-[120px]"
                  {...field}
                  maxLength={1000}
                />
              </FormControl>
              <div className="flex justify-between text-xs text-muted-foreground">
                <FormMessage />
                <span>{field.value.length}/1000</span>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Category
                {detectedCategory && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (Auto-detected: {getCategoryLabel(detectedCategory)})
                  </span>
                )}
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {getCategoryLabel(category)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={createTicket.isPending}
        >
          {createTicket.isPending ? 'Creating Ticket...' : 'Create Support Ticket'}
        </Button>
      </form>
    </Form>
  );
};
