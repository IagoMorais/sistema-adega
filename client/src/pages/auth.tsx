import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";

type LoginData = Pick<InsertUser, "username" | "password">;

export default function AuthPage() {
  const { loginMutation, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const loginForm = useForm<LoginData>({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Se o usuário estiver logado, não renderiza nada enquanto o redirect acontece
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center">
      <div className="container grid lg:grid-cols-2 gap-12 px-4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Adega Serra Azul</CardTitle>
            <CardDescription>
              Entre com suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...loginForm}>
              <form
                onSubmit={loginForm.handleSubmit((data) =>
                  loginMutation.mutate(data)
                )}
                className="space-y-4"
              >
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usuário</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                >
                  Entrar
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="hidden lg:flex flex-col justify-center">
          <h1 className="text-4xl font-bold tracking-tight">
            Sistema de Gestão de Produtos e Estoque
          </h1>
          <p className="mt-4 text-muted-foreground">
            Gerencie seu estoque, vendas e equipe em um só lugar. Com nosso
            sistema, você tem controle total sobre seu negócio.
          </p>
        </div>
      </div>
    </div>
  );
}