import { UserForm } from "@/components/user-form";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

export default function Users() {
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Gerenciar Usuários</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold">Criar Novo Usuário</h2>
          <UserForm />
        </div>

        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold">Usuários do Sistema</h2>
          <div className="border rounded-lg">
            <ScrollArea className="h-[400px] sm:h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Data de Criação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>
                        {user.role === "admin" ? "Administrador" : "Vendedor"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(user.createdAt), "dd/MM/yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}
