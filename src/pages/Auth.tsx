import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Lock, Mail, ArrowLeft, Sparkles, KeyRound } from 'lucide-react';

type AuthMode = 'magic-link' | 'password' | 'forgot-password';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<AuthMode>('magic-link');
  const [emailSent, setEmailSent] = useState(false);
  const { signIn, signInWithMagicLink, resetPassword, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Por favor introduce tu email');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await signInWithMagicLink(email);
      if (error) {
        toast.error(error.message);
      } else {
        setEmailSent(true);
        toast.success('¡Enlace enviado! Revisa tu correo');
      }
    } catch (err) {
      toast.error('Error inesperado');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Por favor introduce tu email');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await resetPassword(email);
      if (error) {
        toast.error(error.message);
      } else {
        setEmailSent(true);
        toast.success('¡Enlace enviado! Revisa tu correo');
      }
    } catch (err) {
      toast.error('Error inesperado');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Invalid login')) {
          toast.error('Email o contraseña incorrectos');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Sesión iniciada');
        navigate('/');
      }
    } catch (err) {
      toast.error('Error inesperado');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">¡Revisa tu correo!</CardTitle>
            <CardDescription>
              {mode === 'forgot-password' 
                ? <>Hemos enviado un enlace para restablecer tu contraseña a <strong>{email}</strong></>
                : <>Hemos enviado un enlace de acceso a <strong>{email}</strong></>
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              {mode === 'forgot-password'
                ? 'Haz clic en el enlace del correo para crear una nueva contraseña.'
                : 'Haz clic en el enlace del correo para iniciar sesión automáticamente.'
              }
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                setEmailSent(false);
                setMode('magic-link');
              }}
            >
              Usar otro email
            </Button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Volver a la app
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getTitle = () => {
    switch (mode) {
      case 'forgot-password': return 'Restablecer contraseña';
      default: return 'Acceso';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'magic-link': return 'Introduce tu email y te enviamos un enlace';
      case 'password': return 'Inicia sesión con email y contraseña';
      case 'forgot-password': return 'Te enviaremos un enlace para crear nueva contraseña';
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{getTitle()}</CardTitle>
          <CardDescription>{getDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          {mode === 'magic-link' && (
            <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={isSubmitting}
                />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                <Sparkles className="h-4 w-4" />
                {isSubmitting ? 'Enviando...' : 'Enviar enlace mágico'}
              </Button>
            </form>
          )}

          {mode === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={isSubmitting}
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  disabled={isSubmitting}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Cargando...' : 'Iniciar sesión'}
              </Button>
              <button
                type="button"
                onClick={() => setMode('forgot-password')}
                className="w-full text-sm text-primary hover:underline flex items-center justify-center gap-1"
              >
                <KeyRound className="h-3 w-3" />
                ¿Olvidaste tu contraseña?
              </button>
            </form>
          )}

          {mode === 'forgot-password' && (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={isSubmitting}
                />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                <KeyRound className="h-4 w-4" />
                {isSubmitting ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </Button>
            </form>
          )}
          
          <div className="mt-4 text-center space-y-2">
            {mode !== 'forgot-password' && (
              <button
                type="button"
                onClick={() => setMode(mode === 'magic-link' ? 'password' : 'magic-link')}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {mode === 'magic-link' 
                  ? '¿Prefieres usar contraseña?' 
                  : '¿Sin contraseña? Usa enlace mágico'
                }
              </button>
            )}
            {mode === 'forgot-password' && (
              <button
                type="button"
                onClick={() => setMode('password')}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Volver al login
              </button>
            )}
            <div>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Volver a la app
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
