import { useCallback } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  EmpresaAtendidaService,
  type EmpresaAtendida,
  type CriarEmpresaAtendidaDTO,
} from "@/lib/services/empresas-atendidas.service";
import { toast } from "sonner";

/**
 * Hook para gerenciar empresas_atendidas com cache
 */
export function useEmpresasAtendidas(projetoId?: string) {
  const qc = useQueryClient();

  // Query: List all empresas_atendidas for a project
  const { data: empresas = [], isLoading } = useQuery({
    queryKey: ["empresas-atendidas", projetoId],
    queryFn: () =>
      projetoId
        ? EmpresaAtendidaService.listar(projetoId)
        : Promise.resolve([]),
    enabled: !!projetoId,
  });

  // Mutation: Create empresa_atendida
  const createMutation = useMutation({
    mutationFn: EmpresaAtendidaService.criar,
    onSuccess: () => {
      toast.success("Empresa adicionada com sucesso!");
      qc.invalidateQueries({ queryKey: ["empresas-atendidas"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao adicionar empresa");
    },
  });

  // Mutation: Update empresa_atendida
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<CriarEmpresaAtendidaDTO>;
    }) => EmpresaAtendidaService.atualizar(id, updates),
    onSuccess: () => {
      toast.success("Empresa atualizada com sucesso!");
      qc.invalidateQueries({ queryKey: ["empresas-atendidas"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar empresa");
    },
  });

  // Mutation: Delete empresa_atendida
  const deleteMutation = useMutation({
    mutationFn: EmpresaAtendidaService.deletar,
    onSuccess: () => {
      toast.success("Empresa removida com sucesso!");
      qc.invalidateQueries({ queryKey: ["empresas-atendidas"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao remover empresa");
    },
  });

  return {
    // Data
    empresas,
    isLoading,

    // Mutations
    criar: createMutation.mutate,
    atualizar: updateMutation.mutate,
    deletar: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
