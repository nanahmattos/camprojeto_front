import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { num, dec, addMonths, hojeIso } from '@/utils/formato'

export const TIPOS = [
  { value: 'PARTICULAR', label: 'Particular' },
  { value: 'CORGUINHOS', label: 'Corguinhos' },
  { value: 'TAURUS', label: 'Taurus' },
  { value: 'LINK', label: 'Link' },
  { value: 'PARAISO DAS AGUAS', label: 'Paraíso das Águas' },
  { value: 'ALCINOPOLIS', label: 'Alcinópolis' },
  { value: 'VOLUS', label: 'Volus' },
]

export const STATUS = ['Em aberto', 'Finalizado', 'Pendente', 'Não aprovado']

export const FORMAS_PAGAMENTO = ['PIX', 'Dinheiro', 'Débito', 'Crédito', 'Pendente']

export const PRECO_HORA_PADRAO = '150,00'

export function tipoLabel(valor) {
  const t = TIPOS.find((x) => x.value === valor)
  return t ? t.label : valor
}

function copia(obj) {
  return JSON.parse(JSON.stringify(obj))
}

export const useOficinaStore = defineStore('oficina', () => {
  // ---- configurações
  const taxas = ref({
    PARTICULAR: '0',
    CORGUINHOS: '',
    TAURUS: '11',
    LINK: '42',
    'PARAISO DAS AGUAS': '',
    ALCINOPOLIS: '',
    VOLUS: '22',
  })

  // margem de lucro por faixa de custo; "ate" vazio = sem limite
  const faixas = ref([
    { ate: '50', margem: '150' },
    { ate: '150', margem: '100' },
    { ate: '300', margem: '85' },
    { ate: '500', margem: '75' },
    { ate: '1500', margem: '60' },
    { ate: '', margem: '55' },
  ])

  const fornecedores = ref([
    { nome: 'Fornecedor A', st: '0', frete: '2', desp: '1' },
    { nome: 'Fornecedor B', st: '8,5', frete: '3', desp: '1' },
    { nome: 'Fornecedor C', st: '0', frete: '0', desp: '0' },
  ])

  const autoPadrao = ref(true)

  // ---- estoque
  function produto(nome, codigo, marca, ncm, qtd, min, max, custo, fornecedor, criado, alterado) {
    return {
      nome,
      codigo,
      marca,
      ncm,
      qtd,
      min,
      max,
      custo,
      fornecedor,
      auto: true,
      margem: '',
      venda: '',
      criado,
      alterado,
    }
  }

  const estoque = ref([
    produto('Filtro de óleo', 'FO-651', 'Marca A', '8421.23.00', '2', '4', '12', '34,50', 'Fornecedor A', '12/08/2026', '28/09/2026'),
    produto('Filtro de combustível', 'FC-651', 'Marca A', '8421.23.00', '5', '3', '10', '94,00', 'Fornecedor B', '12/08/2026', '15/09/2026'),
    produto('Óleo motor 5W30 (litro)', 'OL-5W30', 'Marca B', '2710.19.32', '38', '20', '80', '26,00', 'Fornecedor A', '03/07/2026', '01/10/2026'),
    produto('Pastilha de freio dianteira', 'PF-415', 'Marca C', '6813.81.10', '1', '2', '6', '228,00', 'Fornecedor B', '20/06/2026', '30/09/2026'),
    produto('Disco de freio dianteiro', 'DF-415', 'Marca C', '8708.30.11', '4', '2', '8', '389,00', 'Fornecedor C', '20/06/2026', '10/09/2026'),
    produto('Correia poli-V', 'CP-651', 'Marca A', '4010.31.00', '3', '2', '6', '142,00', 'Fornecedor A', '05/05/2026', '22/08/2026'),
  ])

  function faixaIndice(custo) {
    const f = faixas.value
    for (let i = 0; i < f.length; i++) {
      if (f[i].ate === '' || custo <= num(f[i].ate)) return i
    }
    return f.length - 1
  }

  function faixaTexto(i) {
    const f = faixas.value
    if (i === 0) return 'até R$ ' + f[0].ate
    if (f[i].ate === '') return 'acima de R$ ' + f[i - 1].ate
    return 'R$ ' + f[i - 1].ate + ' a R$ ' + f[i].ate
  }

  function fornecedor(nome) {
    return fornecedores.value.find((x) => x.nome === nome) || { nome, st: '0', frete: '0', desp: '0' }
  }

  // custo + encargos do fornecedor + margem da faixa (ou a margem digitada)
  function preco(custoTexto, nomeFornecedor, margemTexto) {
    const custo = num(custoTexto)
    const f = fornecedor(nomeFornecedor)
    const encargos = num(f.st) + num(f.frete) + num(f.desp)
    const efetivo = custo * (1 + encargos / 100)
    const fi = faixaIndice(custo)
    const sugerida = num(faixas.value[fi].margem)
    const semMargem = margemTexto === '' || margemTexto === null || margemTexto === undefined
    const margem = semMargem ? sugerida : num(margemTexto)
    return { custo, fornecedor: f, encargos, efetivo, faixa: fi, sugerida, margem, venda: efetivo * (1 + margem / 100) }
  }

  function precoVenda(p) {
    return p.auto === false ? num(p.venda) : preco(p.custo, p.fornecedor, p.margem).venda
  }

  function abaixoDoMinimo(p) {
    return p.min !== '' && num(p.qtd) <= num(p.min)
  }

  const qtdRepor = computed(() => estoque.value.filter(abaixoDoMinimo).length)

  function novoProduto(nome = '', codigo = '') {
    return {
      nome,
      codigo,
      marca: '',
      ncm: '',
      qtd: '0',
      min: '',
      max: '',
      custo: '',
      fornecedor: fornecedores.value[0] ? fornecedores.value[0].nome : '',
      auto: autoPadrao.value,
      margem: '',
      venda: '',
      criado: new Date().toLocaleDateString('pt-BR'),
      alterado: '',
    }
  }

  // devolve o índice do produto no estoque
  function salvarProduto(p, indice) {
    const salvo = { ...copia(p), alterado: new Date().toLocaleDateString('pt-BR') }
    if (indice === null || indice === undefined) {
      estoque.value.push(salvo)
      return estoque.value.length - 1
    }
    estoque.value[indice] = salvo
    return indice
  }

  // ---- serviços pré-salvos
  const servicosSalvos = ref([
    { desc: 'Troca de óleo e filtros (motor OM651)', horas: '1' },
    { desc: 'Substituição das pastilhas de freio dianteiras', horas: '1,5' },
    { desc: 'Limpeza e teste de bicos injetores', horas: '2,5' },
    { desc: 'Diagnóstico eletrônico com scanner', horas: '0,5' },
  ])

  // ---- ordens de serviço
  function taxaDoTipo(tipo) {
    return num(taxas.value[tipo])
  }

  function totais(os) {
    const taxa = taxaDoTipo(os.tipo)
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

  function peca(i, qtd) {
    const p = estoque.value[i]
    return { nome: p.nome, codigo: p.codigo, qtd, unit: dec(precoVenda(p)), est: i }
  }

  function servico(desc, horas) {
    return { desc, horas, ph: PRECO_HORA_PADRAO }
  }

  function ordem(id, data, cliente, tipo, veiculo, placa, status, pecas, servicos, parcelas) {
    const os = {
      id,
      data,
      cliente,
      tipo,
      veiculo,
      placa,
      status,
      pecas,
      servicos,
      obsAnalise: '',
      obsInterna: '',
      desconto: { tipo: 'valor', valor: '' },
      pagamento: { parcelas: String(parcelas), data: addMonths(data, 0), forma: 'PIX', obs: '', lista: [] },
    }
    os.pagamento.lista = gerarParcelas(os)
    return os
  }

  const ordens = ref([
    ordem('0148', '2026-10-03', 'IMASUL', 'TAURUS', 'Sprinter 415 CDI (OM651)', 'QAX4F21', 'Em aberto',
      [peca(0, '1'), peca(2, '9'), peca(1, '1'), peca(3, '1')],
      [servico('Troca de óleo e filtros (motor OM651)', '1'), servico('Substituição das pastilhas de freio dianteiras', '1,5')], 2),
    ordem('0147', '2026-10-02', 'Prefeitura de Corguinhos', 'CORGUINHOS', 'Hilux 2.8 CD', 'RRB7C43', 'Pendente',
      [peca(4, '2'), peca(3, '1')], [servico('Substituição de discos e pastilhas dianteiros', '3')], 3),
    ordem('0146', '2026-10-01', 'Marcos A. Silva', 'PARTICULAR', 'Onix 1.0 Turbo', 'QAE2J18', 'Finalizado',
      [peca(0, '1'), peca(2, '4')], [servico('Troca de óleo e filtro', '0,5')], 1),
    ordem('0145', '2026-09-30', 'Prefeitura de Alcinópolis', 'ALCINOPOLIS', 'S10 2.8 LTZ', 'RWE5D09', 'Em aberto',
      [peca(5, '1'), peca(1, '1'), peca(0, '1'), peca(2, '7')], [servico('Troca da correia poli-V', '2'), servico('Revisão de filtros', '1')], 2),
    ordem('0144', '2026-09-29', 'Frota via Link', 'LINK', 'Ducato Minibus', 'QAJ8H66', 'Não aprovado',
      [peca(4, '2'), peca(3, '1')], [servico('Substituição de discos e pastilhas dianteiros', '3')], 1),
    ordem('0143', '2026-09-27', 'Prefeitura de Paraíso das Águas', 'PARAISO DAS AGUAS', 'Ranger 3.2', 'QAR1B52', 'Finalizado',
      [peca(5, '1'), peca(4, '2'), peca(3, '1')], [servico('Diagnóstico eletrônico com scanner', '0,5'), servico('Freios dianteiros completos', '3')], 2),
    ordem('0142', '2026-09-26', 'Ana Paula Rezende', 'PARTICULAR', 'HB20 1.6', 'QAC6G37', 'Em aberto',
      [peca(0, '1'), peca(2, '4')], [servico('Troca de óleo e filtro', '0,5')], 1),
  ])

  function proximoNumero() {
    const maior = ordens.value.reduce((a, o) => Math.max(a, parseInt(o.id, 10) || 0), 0)
    return String(maior + 1).padStart(4, '0')
  }

  function novaOrdem() {
    const hoje = hojeIso()
    const os = {
      id: '',
      data: hoje,
      cliente: '',
      tipo: 'PARTICULAR',
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

  // cópia para edição; só volta para a lista ao salvar
  function buscarOrdem(id) {
    const os = ordens.value.find((o) => o.id === id)
    return os ? copia(os) : null
  }

  function salvarOrdem(os) {
    const salva = copia(os)
    if (!salva.id) salva.id = proximoNumero()
    const i = ordens.value.findIndex((o) => o.id === salva.id)
    if (i >= 0) ordens.value[i] = salva
    else ordens.value.unshift(salva)
    return salva.id
  }

  return {
    taxas,
    faixas,
    fornecedores,
    autoPadrao,
    estoque,
    servicosSalvos,
    ordens,
    qtdRepor,
    faixaTexto,
    preco,
    precoVenda,
    abaixoDoMinimo,
    novoProduto,
    salvarProduto,
    taxaDoTipo,
    totais,
    gerarParcelas,
    novaOrdem,
    buscarOrdem,
    salvarOrdem,
  }
})
