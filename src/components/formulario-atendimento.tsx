import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { maskCPF } from "@/lib/masks";
import { AlertCircle, CheckCircle, Calendar } from "lucide-react";
import { AtendimentoService } from "@/lib/services/atendimentos.service";
import { EmpresaAtendidaService } from "@/lib/services/empresas-atendidas.service";

type Atendimento = Record<string, any>;

const empty: Atendimento = {
  projeto_id: "",
  empresa_id: "",
  consultor_id: "",
  data: "",
  horas: "1",
  descricao: "",
  categoria: "",
  meio_atendimento: "",
  tema: "",
  cidade: "",
};

export function FormularioAtendimento({
  trigger,
  atendimento,
  projetoId,
  onSaved,
}: {
  trigger: React.ReactNode;
  atendimento?: Atendimento;
  projetoId?: string;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Atendimento>(empty);
  const [saving, setSaving] = useState(false);
  const [validacaoAgenda, setValidacaoAgenda] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);
  const qc = useQueryClient();

  // Load projects
  const { data: projetos } = useQuery({
    queryKey: ["projetos-select"],
    queryFn: async () =>
      (await supabase.from("projetos").select("id,nome").order("nome")).data ??
      [],
    enabled: open,
  });

  // Load empresas for selected project
  const { data: empresas } = useQuery({
    queryKey: ["empresas-atendidas", form.projeto_id],
    queryFn: () =>
      form.projeto_id
        ? EmpresaAtendidaService.listar(form.projeto_id)
        : Promise.resolve([]),
    enabled: open && !!form.projeto_id,
  });

  // Load consultores
  const { data: consultores } = useQuery({
    queryKey: ["consultores-select"],
    queryFn: async () =>
      (await supabase
        .from("consultores")
        .select("id,nome,cpf")
        .eq("ativo", true)
        .order("nome")).data ?? [],
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setForm(atendimento ?? { ...empty, projeto_id: projetoId ?? "" });
      setValidacaoAgenda(null);
    }
  }, [open, atendimento, projetoId]);

  // Validate schedule conflict when consultant or date changes
  useEffect(() => {
    if (!open || !form.consultor_id || !form.data) {
      setValidacaoAgenda(null);
      return;
    }

    const validarAgendaDebounce = async () => {
      try {
        const resultado = await AtendimentoService.validarConflitosAgenda(
          form.consultor_id,
          form.data,
          form.id // Exclude current appointment if updating
        );
        setValidacaoAgenda({
          ok: resultado.disponivel,
          msg: resultado.mensagem,
        });
      } catch (err) {
        console.error("Erro ao validar agenda:", err);
        setValidacaoAgenda(null);
      }
    };

    const timer = setTimeout(validarAgendaDebounce, 500);
    return () => clearTimeout(timer);
  }, [form.consultor_id, form.data, form.id, open]);

  const consultorSelecionado = consultores?.find(
    (c) => c.id === form.consultor_id
  );
  const projectoSelecionado = projetos?.find(
    (p) => p.id === form.projeto_id
  );

  async function save() {
    // Validar preenchimento
    if (!form.projeto_id)
      return toast.error("Selecione um projeto");
    if (!form.empresa_id) return toast.error("Selecione uma empresa");
    if (!form.consultor_id)
      return toast.error("Selecione um consultor");
    if (!form.data) return toast.error("Selecione a data");
    if (!form.horas || Number(form.horas) <= 0)
      return toast.error("Informe as horas (maior que 0)");
    if (!form.cidade) return toast.error("Informe a cidade");

    // Validar agenda
    if (!validacaoAgenda?.ok) {
      return toast.error(validacaoAgenda?.msg || "Consultor indisponível");
    }

    setSaving(true);

    try {
      const payload = {
        projeto_id: form.projeto_id,
        empresa_id: form.empresa_id,
        consultor_id: form.consultor_id,
        data: form.data,
        horas: Number(form.horas),
        descricao: form.descricao || null,
        categoria: form.categoria || null,
        meio_atendimento: form.meio_atendimento || null,
        tema: form.tema || null,
        cidade: form.cidade,
      };

      if (form.id) {
        await AtendimentoService.atualizar(form.id, payload);
        toast.success("Atendimento atualizado");
      } else {
        await AtendimentoService.criar(payload);
        toast.success("Atendimento registrado");
      }

      qc.invalidateQueries();
      setOpen(false);
      onSaved?.();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar atendimento");
    } finally {
      setSaving(false);
    }
  }

  const set = (k: string, v: any) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {form.id ? "Editar Atendimento" : "Novo Atendimento"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          {/* Row 1: Project and Company */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label>Projeto *</Label>
              <Select value={form.projeto_id} onValueChange={(v) => set("projeto_id", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {projetos?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Empresa Atendida *</Label>
              <Select value={form.empresa_id} onValueChange={(v) => set("empresa_id", v)}>
                <SelectTrigger disabled={!form.projeto_id}>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {empresas?.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Consultant and Date */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label>Consultor *</Label>
              <Select
                value={form.consultor_id}
                onValueChange={(v) => set("consultor_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {consultores?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome} {c.cpf ? `(${maskCPF(c.cpf)})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data *</Label>
              <Input
                type="date"
                value={form.data ?? ""}
                onChange={(e) => set("data", e.target.value)}
              />
            </div>
          </div>

          {/* Schedule Validation Status */}
          {validacaoAgenda && form.consultor_id && form.data && (
            <div
              className={`flex items-start gap-2 rounded-md p-3 ${
                validacaoAgenda.ok
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {validacaoAgenda.ok ? (
                <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">{validacaoAgenda.msg}</p>
              </div>
            </div>
          )}

          {/* Row 3: Hours and City */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label>Horas *</Label>
              <Input
                type="number"
                step="0.5"
                min="0.5"
                value={form.horas ?? ""}
                onChange={(e) => set("horas", e.target.value)}
              />
            </div>
            <div>
              <Label>Cidade *</Label>
              <Input
                value={form.cidade ?? ""}
                onChange={(e) => set("cidade", e.target.value)}
              />
            </div>
          </div>

          {/* Row 4: Category, Theme, Meio Atendimento */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <Label>Categoria</Label>
              <Input
                value={form.categoria ?? ""}
                onChange={(e) => set("categoria", e.target.value)}
              />
            </div>
            <div>
              <Label>Tema</Label>
              <Input
                value={form.tema ?? ""}
                onChange={(e) => set("tema", e.target.value)}
              />
            </div>
            <div>
              <Label>Meio de Atendimento</Label>
              <Input
                value={form.meio_atendimento ?? ""}
                onChange={(e) => set("meio_atendimento", e.target.value)}
              />
            </div>
          </div>

          {/* Row 5: Description */}
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={form.descricao ?? ""}
              onChange={(e) => set("descricao", e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={save}
            disabled={saving || !validacaoAgenda?.ok}
          >
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
