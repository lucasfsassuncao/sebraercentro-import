import { useState, useCallback } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  AtendimentoService,
  type Atendimento,
  type CriarAtendimentoDTO,
} from "@/lib/services/atendimentos.service";
import { toast } from "sonner";

/**
 * Hook para gerenciar atendimentos com cache e validações
 * Inclui validação de conflitos de agenda em tempo real
 */
export function useAtendimentos(projetoId?: string) {
  const qc = useQueryClient();
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  // Query: List all atendimentos
  const { data: atendimentos = [], isLoading } = useQuery({
    queryKey: ["atendimentos", projetoId],
    queryFn: () => AtendimentoService.listar(projetoId),
    enabled: !!projetoId,
  });

  // Mutation: Create atendimento
  const createMutation = useMutation({
    mutationFn: async (dto: CriarAtendimentoDTO) => {
      setErroValidacao(null);
      return AtendimentoService.criar(dto);
    },
    onSuccess: () => {
      toast.success("Atendimento registrado com sucesso!");
      qc.invalidateQueries({ queryKey: ["atendimentos"] });
    },
    onError: (error: any) => {
      const msg = error.message || "Erro ao registrar atendimento";
      setErroValidacao(msg);
      toast.error(msg);
    },
  });

  // Mutation: Update atendimento
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<CriarAtendimentoDTO>;
    }) => {
      setErroValidacao(null);
      return AtendimentoService.atualizar(id, updates);
    },
    onSuccess: () => {
      toast.success("Atendimento atualizado com sucesso!");
      qc.invalidateQueries({ queryKey: ["atendimentos"] });
    },
    onError: (error: any) => {
      const msg = error.message || "Erro ao atualizar atendimento";
      setErroValidacao(msg);
      toast.error(msg);
    },
  });

  // Mutation: Delete atendimento
  const deleteMutation = useMutation({
    mutationFn: AtendimentoService.deletar,
    onSuccess: () => {
      toast.success("Atendimento removido com sucesso!");
      qc.invalidateQueries({ queryKey: ["atendimentos"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao remover atendimento");
    },
  });

  // Query: Validate schedule conflicts
  const validarAgenda = useCallback(
    async (
      consultorId: string,
      data: string,
      atendimentoId?: string
    ) => {
      return AtendimentoService.validarConflitosAgenda(
        consultorId,
        data,
        atendimentoId
      );
    },
    []
  );

  // Query: Check consultant availability for date range
  const verificarDisponibilidade = useCallback(
    (consultorId: string, dataInicio: string, dataFim: string) => {
      return AtendimentoService.verificarDisponibilidadeConsultor(
        consultorId,
        dataInicio,
        dataFim
      );
    },
    []
  );

  return {
    // Data
    atendimentos,
    isLoading,
    erroValidacao,

    // Mutations
    criar: createMutation.mutate,
    atualizar: updateMutation.mutate,
    deletar: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Validations
    validarAgenda,
    verificarDisponibilidade,
  };
}
