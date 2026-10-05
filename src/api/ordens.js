import { api } from '@/boot/axios'
import { num, dec, paraTexto } from '@/utils/formato'

// a API grava códigos sem acento; a tela mostra os nomes
export const STATUS_API = { em_aberto: 'Em aberto', finalizado: 'Finalizado', pendente: 'Pendente', nao_aprovado: 'Não aprovado' }
export const FORMAS_API = { pix: 'PIX', dinheiro: 'Dinheiro', debito: 'Débito', credito: 'Crédito', pendente: 'Pendente' }

const codigo = (mapa, rotulo) => Object.keys(mapa).find((k) => mapa[k] === rotulo)

export const numeroOS = (n) => (n ? String(n).padStart(4, '0') : '')

// ---- ordens de serviço

export async function listarOrdens(filtros) {
  const { data } = await api.get('/ordens', { params: filtros })
  return data // { data: [...], meta: { total, contagem: { todos, em_aberto, ... } } }
}

export async function obterOrdem(numero) {
  const { data } = await api.get('/ordens/' + numero)
  return paraForm(data.data)
}

export async function salvarOrdem(form) {
  const payload = paraPayload(form)
  const { data } = form.numero ? await api.put('/ordens/' + form.numero, payload) : await api.post('/ordens', payload)
  return paraForm(data.data)
}

export async function excluirOrdem(numero) {
  await api.delete('/ordens/' + numero)
}

// pergunta antes de excluir; resolve true se confirmou
export function confirmarExclusao($q, texto) {
  return new Promise((resolve) => {
    $q.dialog({
      title: 'Excluir ' + texto + '?',
      message:
        'Não dá para desfazer. Se alguma O.S estiver finalizada, as peças dela voltam para o estoque. O número não é reaproveitado.',
      ok: { label: 'Excluir', color: 'negative', unelevated: true, noCaps: true },
      cancel: { label: 'Cancelar', flat: true, noCaps: true, color: 'grey-8' },
      persistent: true
    })
      .onOk(() => resolve(true))
      .onCancel(() => resolve(false))
  })
}

// ---- clientes, veículos e serviços pré-salvos

export async function buscarClientes(busca) {
  const { data } = await api.get('/clientes', { params: { busca } })
  return data.data
}

// null quando a placa ainda não está cadastrada
export async function veiculoPorPlaca(placa) {
  try {
    const { data } = await api.get('/veiculos/' + encodeURIComponent(placa))
    return data.data
  } catch (e) {
    if (e.response?.status === 404) return null
    throw e
  }
}

export async function listarServicosSalvos(veiculoId) {
  const { data } = await api.get('/servicos-salvos', { params: { veiculo_id: veiculoId || undefined } })
  return data.data.map((s) => ({ id: s.id, desc: s.descricao, horas: paraTexto(s.horas), doVeiculo: !!s.veiculo_id }))
}

export async function criarServicosSalvos(servicos, veiculoId) {
  await api.post('/servicos-salvos', {
    veiculo_id: veiculoId || null,
    servicos: servicos.map((s) => ({ descricao: s.desc, horas: num(s.horas) }))
  })
}

export async function atualizarServicoSalvo(s) {
  await api.put('/servicos-salvos/' + s.id, { descricao: s.desc, horas: num(s.horas) })
}

export async function apagarServicoSalvo(id) {
  await api.delete('/servicos-salvos/' + id)
}

// ---- formulário do editor: números como texto ("1,5"), igual ao que se digita

function qtdTexto(v) {
  return String(Math.round(v * 1000) / 1000).replace('.', ',')
}

export function paraForm(o) {
  return {
    numero: o.numero,
    data: o.data,
    clienteId: o.cliente.id,
    cliente: o.cliente.nome,
    tipo: o.tipo_cliente_id,
    taxa: paraTexto(o.taxa_percent),
    veiculoId: o.veiculo?.id ?? null,
    veiculo: o.veiculo?.modelo ?? '',
    placa: o.veiculo?.placa ?? '',
    status: STATUS_API[o.status],
    pecas: o.pecas.map((p) => ({
      nome: p.nome,
      codigo: p.codigo || '',
      qtd: qtdTexto(p.quantidade),
      unit: dec(p.valor_unit),
      est: p.produto_id
    })),
    servicos: o.servicos.map((s) => ({ desc: s.descricao, horas: paraTexto(s.horas), tabela: s.tabela_preco_id, ph: dec(s.preco_hora) })),
    obsAnalise: o.obs_analise || '',
    obsInterna: o.obs_interna || '',
    desconto: { tipo: o.desconto_tipo, valor: o.desconto_valor ? paraTexto(o.desconto_valor) : '' },
    pagamento: {
      parcelas: String(o.parcelas.length || 1),
      data: o.parcelas[0]?.vencimento || o.data,
      forma: FORMAS_API[o.pagamento_forma],
      obs: o.pagamento_obs || '',
      lista: o.parcelas.map((p) => ({
        data: p.vencimento,
        valor: dec(p.valor),
        forma: FORMAS_API[p.forma],
        obs: p.observacao || '',
        pagoEm: p.pago_em
      }))
    },
    criadoEm: o.criado_em,
    atualizadoEm: o.atualizado_em
  }
}

function paraPayload(f) {
  const placa = (f.placa || '').trim()
  const modelo = (f.veiculo || '').trim()
  return {
    data: f.data,
    status: codigo(STATUS_API, f.status),
    tipo_cliente_id: f.tipo,
    cliente: { id: f.clienteId || null, nome: (f.cliente || '').trim() },
    veiculo: placa || modelo ? { placa, modelo } : null,
    obs_analise: f.obsAnalise || null,
    obs_interna: f.obsInterna || null,
    desconto_tipo: f.desconto.tipo,
    desconto_valor: num(f.desconto.valor),
    pagamento_forma: codigo(FORMAS_API, f.pagamento.forma),
    pagamento_obs: f.pagamento.obs || null,
    // linhas deixadas em branco na tela não vão para o banco
    pecas: f.pecas
      .filter((p) => p.nome.trim() || num(p.unit) > 0)
      .map((p) => ({
        produto_id: p.est || null,
        nome: p.nome.trim(),
        codigo: p.codigo.trim() || null,
        quantidade: num(p.qtd),
        valor_unit: num(p.unit)
      })),
    servicos: f.servicos
      .filter((s) => s.desc.trim() || num(s.horas) > 0)
      .map((s) => ({ tabela_preco_id: s.tabela || null, descricao: s.desc.trim(), horas: num(s.horas), preco_hora: num(s.ph) })),
    parcelas: f.pagamento.lista.map((p) => ({
      vencimento: p.data,
      valor: num(p.valor),
      forma: codigo(FORMAS_API, p.forma),
      observacao: p.obs || null,
      pago_em: p.pagoEm || null
    }))
  }
}
