import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/boot/axios'
import { resumoEstoque } from '@/api/produtos'
import { num, dec, addMonths, hojeIso, paraTexto } from '@/utils/formato'

export const STATUS = ['Em aberto', 'Finalizado', 'Pendente', 'Não aprovado']

export const FORMAS_PAGAMENTO = ['PIX', 'Dinheiro', 'Débito', 'Crédito', 'Pendente']

export const useOficinaStore = defineStore('oficina', () => {
  // ---- configurações (vêm da API: GET /api/configuracoes)
  // números ficam como texto no padrão brasileiro ("8,5"), igual ao que se digita nos campos
  const configCarregada = ref(false)

  // tipos de cliente, fornecedores e tabelas de preço vêm com os desativados (ativo: false):
  // eles somem das listas de escolha, mas O.S e produtos antigos ainda mostram o nome
  const tiposCliente = ref([]) // { id, nome, taxa, ativo }
  const fornecedores = ref([]) // { id, nome, st, frete, desp, ativo }
  const tabelasPreco = ref([]) // { id, nome, preco, padrao, ativo }

  const tiposAtivos = computed(() => tiposCliente.value.filter((t) => t.ativo))
  const fornecedoresAtivos = computed(() => fornecedores.value.filter((f) => f.ativo))
  const tabelasAtivas = computed(() => tabelasPreco.value.filter((t) => t.ativo))
  const tabelaPadrao = computed(() => tabelasAtivas.value.find((t) => t.padrao) || tabelasAtivas.value[0] || null)
  const precoHoraPadrao = computed(() => (tabelaPadrao.value ? tabelaPadrao.value.preco : '0,00'))

  // margem de lucro por faixa de custo; "ate" vazio = sem limite
  const faixas = ref([
    { ate: '50', margem: '150' },
    { ate: '150', margem: '100' },
    { ate: '300', margem: '85' },
    { ate: '500', margem: '75' },
    { ate: '1500', margem: '60' },
    { ate: '', margem: '55' },
  ])

  const autoPadrao = ref(true)

  function aplicarConfiguracoes(d) {
    autoPadrao.value = d.preco_auto_padrao
    tiposCliente.value = d.tipos_cliente.map((t) => ({ id: t.id, nome: t.nome, taxa: paraTexto(t.taxa_percent), ativo: t.ativo }))
    faixas.value = d.faixas_margem.map((f) => ({ id: f.id, ate: paraTexto(f.ate_valor), margem: paraTexto(f.margem_percent) }))
    tabelasPreco.value = d.tabelas_preco.map((t) => ({ id: t.id, nome: t.nome, preco: dec(t.preco_hora), padrao: t.padrao, ativo: t.ativo }))
    fornecedores.value = d.fornecedores.map((f) => ({
      id: f.id,
      nome: f.nome,
      st: paraTexto(f.st_percent),
      frete: paraTexto(f.frete_percent),
      desp: paraTexto(f.despesas_percent),
      ativo: f.ativo,
    }))
    configCarregada.value = true
  }

  async function carregarConfiguracoes() {
    const { data } = await api.get('/configuracoes')
    aplicarConfiguracoes(data)
  }

  // recebe a tela inteira (só os itens ativos; o que saiu da lista é desativado pela API)
  async function salvarConfiguracoes(c) {
    const { data } = await api.put('/configuracoes', {
      preco_auto_padrao: c.autoPadrao,
      tipos_cliente: c.tiposCliente.map((t) => ({ id: t.id || null, nome: t.nome, taxa_percent: num(t.taxa) })),
      faixas_margem: c.faixas.map((f) => ({
        ate_valor: f.ate === '' || f.ate === null ? null : num(f.ate),
        margem_percent: num(f.margem),
      })),
      tabelas_preco: c.tabelasPreco.map((t) => ({ id: t.id || null, nome: t.nome, preco_hora: num(t.preco), padrao: !!t.padrao })),
      fornecedores: c.fornecedores.map((f) => ({
        id: f.id || null,
        nome: f.nome,
        st_percent: num(f.st),
        frete_percent: num(f.frete),
        despesas_percent: num(f.desp),
      })),
    })
    aplicarConfiguracoes(data)
  }

  function tipoLabel(id) {
    const t = tiposCliente.value.find((x) => x.id === id)
    return t ? t.nome : ''
  }

  function tipoPadraoId() {
    const t = tiposAtivos.value.find((x) => x.nome === 'Particular') || tiposAtivos.value[0]
    return t ? t.id : null
  }

  function tabelaPreco(id) {
    return tabelasPreco.value.find((t) => t.id === id) || null
  }

  // ---- estoque (produtos vêm da API: src/api/produtos.js)
  const qtdRepor = ref(0)

  async function carregarResumoEstoque() {
    qtdRepor.value = (await resumoEstoque()).abaixo_minimo
  }

  function faixaIndice(custo) {
    const f = faixas.value
    if (!f.length) return -1
    for (let i = 0; i < f.length; i++) {
      if (f[i].ate === '' || custo <= num(f[i].ate)) return i
    }
    return f.length - 1
  }

  function faixaTexto(i) {
    const f = faixas.value
    if (i < 0) return 'nenhuma faixa cadastrada'
    if (i === 0) return 'até R$ ' + f[0].ate
    if (f[i].ate === '') return 'acima de R$ ' + f[i - 1].ate
    return 'R$ ' + f[i - 1].ate + ' a R$ ' + f[i].ate
  }

  function fornecedor(id) {
    return fornecedores.value.find((x) => x.id === id) || { id: null, nome: '', st: '0', frete: '0', desp: '0' }
  }

  // prévia enquanto se digita; o preço que vale é o calculado pela API (app/Services/Precificacao.php)
  // custo + encargos do fornecedor + margem da faixa (ou a margem digitada)
  function preco(custoTexto, fornecedorId, margemTexto) {
    const custo = num(custoTexto)
    const f = fornecedor(fornecedorId)
    const encargos = num(f.st) + num(f.frete) + num(f.desp)
    const efetivo = custo * (1 + encargos / 100)
    const fi = faixaIndice(custo)
    const sugerida = fi < 0 ? 0 : num(faixas.value[fi].margem)
    const semMargem = margemTexto === '' || margemTexto === null || margemTexto === undefined
    const margem = semMargem ? sugerida : num(margemTexto)
    return { custo, fornecedor: f, encargos, efetivo, faixa: fi, sugerida, margem, venda: efetivo * (1 + margem / 100) }
  }

  // ---- ordens de serviço
  function taxaDoTipo(id) {
    const t = tiposCliente.value.find((x) => x.id === id)
    return t ? num(t.taxa) : 0
  }

  // prévia dos totais enquanto se edita; o valor que vale é o calculado pela API (CalculoOrcamento.php).
  // os.taxa = taxa gravada na O.S no dia em que foi feita (não muda se a configuração mudar depois)
  function totais(os) {
    const taxa = os.taxa !== undefined && os.taxa !== null ? num(os.taxa) : taxaDoTipo(os.tipo)
    const pecas = os.pecas.reduce((a, p) => a + num(p.qtd) * num(p.unit), 0)
    const servicos = os.servicos.reduce((a, s) => a + num(s.horas) * num(s.ph), 0)
    const total = pecas + servicos
    const comTaxa = total * (1 + taxa / 100)
    // desconto sobre o valor já com a taxa do tipo de cliente, em R$ ou em %
    const d = os.desconto || { tipo: 'valor', valor: '' }
    const pedido = d.tipo === 'pct' ? comTaxa * (num(d.valor) / 100) : num(d.valor)
    const desconto = Math.min(Math.max(pedido, 0), comTaxa)
    return { taxa, pecas, servicos, total, comTaxa, desconto, totalCliente: comTaxa - desconto }
  }

  // divide o total em parcelas mensais; a última absorve os centavos
  function gerarParcelas(os) {
    const pg = os.pagamento
    const n = Math.max(1, Math.min(24, parseInt(pg.parcelas, 10) || 1))
    const centavos = Math.round(totais(os).totalCliente * 100)
    const cada = Math.floor(centavos / n)
    const lista = []
    for (let k = 0; k < n; k++) {
      const c = k === n - 1 ? centavos - cada * (n - 1) : cada
      lista.push({ data: addMonths(pg.data || hojeIso(), k), valor: dec(c / 100), forma: pg.forma, obs: '' })
    }
    return lista
  }

  function servico(desc, horas) {
    return { desc, horas, tabela: tabelaPadrao.value?.id ?? null, ph: precoHoraPadrao.value }
  }

  function novaOrdem() {
    const hoje = hojeIso()
    const tipo = tipoPadraoId()
    const os = {
      numero: null,
      data: hoje,
      clienteId: null,
      cliente: '',
      tipo,
      taxa: tiposCliente.value.find((t) => t.id === tipo)?.taxa ?? '0',
      veiculoId: null,
      veiculo: '',
      placa: '',
      status: 'Em aberto',
      pecas: [{ nome: '', codigo: '', qtd: '1', unit: '', est: null }],
      servicos: [servico('', '')],
      obsAnalise: '',
      obsInterna: '',
      desconto: { tipo: 'valor', valor: '' },
      pagamento: { parcelas: '1', data: hoje, forma: 'PIX', obs: '', lista: [] },
    }
    os.pagamento.lista = gerarParcelas(os)
    return os
  }

  return {
    configCarregada,
    tiposCliente,
    tiposAtivos,
    faixas,
    fornecedores,
    fornecedoresAtivos,
    tabelasPreco,
    tabelasAtivas,
    tabelaPadrao,
    tabelaPreco,
    autoPadrao,
    precoHoraPadrao,
    servico,
    carregarConfiguracoes,
    salvarConfiguracoes,
    tipoLabel,
    qtdRepor,
    carregarResumoEstoque,
    faixaTexto,
    preco,
    taxaDoTipo,
    totais,
    gerarParcelas,
    novaOrdem,
  }
})
