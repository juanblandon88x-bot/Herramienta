import { useState, useEffect } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('useAuth: Initializing...')
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('useAuth: Initial session:', session)
      console.log('useAuth: Initial session error:', error)
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }).catch((error) => {
      console.error('useAuth: Error getting session:', error)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('useAuth: Auth state changed:', _event, session)
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    console.log('useAuth: Attempting sign in for:', email)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      console.log('useAuth: Sign in result:', { data, error })
      return { data, error }
    } catch (error) {
      console.error('useAuth: Sign in error:', error)
      return { data: null, error }
    }
  }

  const signUp = async (email: string, password: string) => {
    console.log('useAuth: Attempting sign up for:', email)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      console.log('useAuth: Sign up result:', { data, error })
      return { data, error }
    } catch (error) {
      console.error('useAuth: Sign up error:', error)
      return { data: null, error }
    }
  }

  const signOut = async () => {
    console.log('useAuth: Attempting sign out')
    try {
      const { error } = await supabase.auth.signOut()
      console.log('useAuth: Sign out result:', { error })
      return { error }
    } catch (error) {
      console.error('useAuth: Sign out error:', error)
      return { error }
    }
  }

  console.log('useAuth: Current state - user:', !!user, 'loading:', loading)

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  }
}