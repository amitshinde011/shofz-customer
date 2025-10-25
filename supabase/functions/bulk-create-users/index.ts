import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

interface UserInput {
  email: string
  name: string
  phone?: string
  is_active?: boolean
  roles: string[]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { users } = await req.json() as { users: UserInput[] }

    // Fetch default password from settings
    const { data: settingData, error: settingError } = await supabaseClient
      .from('platform_settings')
      .select('value')
      .eq('key', 'default_user_password')
      .single()

    const defaultPassword = settingData?.value || 'bshofz011' // Fallback if setting not found

    const results = {
      success: [] as { email: string; id: string }[],
      failed: [] as { email: string; error: string }[]
    }

    for (const user of users) {
      try {
        // Create auth user with admin API
        const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
          email: user.email,
          password: defaultPassword,
          email_confirm: true,
          user_metadata: {
            name: user.name,
            phone: user.phone,
            // Signal to trigger: don't add customer role if not selected
            skip_customer_role: !user.roles.includes('customer') ? 'true' : 'false'
          }
        })

        if (authError) throw authError

        const userId = authData.user.id

        // Update user table (should be created by trigger, but ensure it's updated)
        const { error: userError } = await supabaseClient
          .from('users')
          .update({
            name: user.name,
            phone: user.phone,
            is_active: user.is_active ?? true
          })
          .eq('id', userId)

        if (userError) {
          console.warn('User table update warning:', userError)
        }

        // Add all selected roles (including customer if selected)
        for (const role of user.roles) {
          const { error: roleError } = await supabaseClient
            .from('user_roles')
            .insert({
              user_id: userId,
              role: role,
              is_active: true
            })

          // Ignore duplicate key errors (role already exists from trigger)
          if (roleError && roleError.code !== '23505') {
            console.warn(`Role ${role} error for ${user.email}:`, roleError)
          }
        }

        results.success.push({ email: user.email, id: userId })
      } catch (error: any) {
        results.failed.push({
          email: user.email,
          error: error.message || 'Unknown error'
        })
      }
    }

    return new Response(
      JSON.stringify(results),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
