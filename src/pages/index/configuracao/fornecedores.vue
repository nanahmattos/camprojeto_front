<template>
  <q-page padding>
    <div class="pagina">
      <div class="row items-end justify-between q-gutter-y-md">
        <div>
          <h1 class="titulo-pagina">Cadastro de fornecedores</h1>
          <p class="subtitulo-pagina">Dados do fornecedor e o ICMS / ST que entra no custo das peças</p>
        </div>
        <q-btn v-if="podeEditar" unelevated no-caps color="primary" icon="add" label="Adicionar fornecedor" @click="abrir(null)" />
      </div>

      <q-banner v-if="!podeEditar" dense rounded class="bg-grey-3 text-grey-9">
        <template #avatar><q-icon name="lock_outline" /></template>
        Só administradores podem alterar os fornecedores. Você está vendo os dados atuais.
      </q-banner>

      <section class="cartao q-pa-md row q-col-gutter-sm items-center" aria-label="Busca de fornecedores">
        <q-input
          v-model="busca"
          placeholder="Buscar por nome, razão social ou CPF/CNPJ"
          aria-label="Buscar fornecedor"
          outlined
          dense
          clearable
          class="col-12 col-sm-6 col-md-5"
        >
          <template #prepend><q-icon name="search" /></template>
        </q-input>
      </section>

      <q-table
        :rows="filtrados"
        :columns="colunas"
        row-key="id"
        flat
        bordered
        class="tabela-oficina"
        :loading="carregando"
        :pagination="{ rowsPerPage: 0 }"
        hide-pagination
        :no-data-label="erro || (busca ? 'Nenhum fornecedor encontrado.' : 'Nenhum fornecedor cadastrado ainda.')"
      >
        <template #body-cell-nome="props">
          <q-td :props="props">
            <div class="text-weight-bold">{{ props.row.nome }}</div>
            <div v-if="props.row.razao_social && props.row.razao_social !== props.row.nome" class="texto-apoio" style="font-size: 12px">
              {{ props.row.razao_social }}
            </div>
          </q-td>
        </template>

        <template #body-cell-contato="props">
          <q-td :props="props">
            <div>{{ props.row.contato || '—' }}</div>
            <div v-if="props.row.telefone || props.row.email" class="texto-apoio" style="font-size: 12px">
              {{ [props.row.telefone, props.row.email].filter(Boolean).join(' · ') }}
            </div>
          </q-td>
        </template>

        <template #body-cell-st="props">
          <q-td :props="props" class="text-mono">
            <span v-if="props.row.st_recolhido" class="text-grey-7">já recolhido</span>
            <span v-else class="text-weight-bold">+{{ pct(stDoFornecedor(props.row)) }}</span>
          </q-td>
        </template>

        <template #body-cell-acoes="props">
          <q-td :props="props">
            <q-btn
              flat
              round
              dense
              :icon="podeEditar ? 'edit' : 'visibility'"
              color="grey-8"
              :aria-label="(podeEditar ? 'Editar ' : 'Ver ') + props.row.nome"
              @click="abrir(props.row)"
            />
            <q-btn
              v-if="podeEditar"
              flat
              round
              dense
              icon="delete_outline"
              color="negative"
              :aria-label="'Excluir ' + props.row.nome"
              @click="excluir(props.row)"
            />
          </q-td>
        </template>
      </q-table>
    </div>

    <q-dialog v-model="dialogo.aberto" @hide="dialogo.erro = ''">
      <q-card style="width: 720px; max-width: 95vw">
        <q-card-section class="row items-center no-wrap">
          <h2 class="titulo-secao col" style="font-size: 19px">
            {{ !podeEditar ? 'Fornecedor' : dialogo.id ? 'Editar fornecedor' : 'Novo fornecedor' }}
          </h2>
          <q-btn flat round dense icon="close" aria-label="Fechar" v-close-popup />
        </q-card-section>
        <q-separator />

        <q-card-section class="column q-gutter-y-md">
          <q-banner v-if="dialogo.erro" dense rounded class="bg-red-1 text-negative" role="alert">
            <template #avatar><q-icon name="error_outline" /></template>
            {{ dialogo.erro }}
          </q-banner>

          <div>
            <div class="rotulo-coluna q-mb-sm">Dados do fornecedor</div>
            <div class="row q-col-gutter-sm">
              <q-select
                v-model="form.tipo_pessoa"
                :options="opcoesTipoPessoa"
                label="Tipo da pessoa *"
                emit-value
                map-options
                outlined
                dense
                :readonly="!podeEditar"
                class="col-12 col-sm-4"
                @update:model-value="form.cpf_cnpj = ''"
              />
              <q-input
                v-model="form.nome"
                label="Nome *"
                hint="Como aparece nas listas"
                maxlength="150"
                outlined
                dense
                autofocus
                :readonly="!podeEditar"
                class="col-12 col-sm-8"
              />
              <q-input
                v-model="form.razao_social"
                :label="fisica ? 'Nome completo' : 'Razão social'"
                maxlength="150"
                outlined
                dense
                :readonly="!podeEditar"
                class="col-12 col-sm-8"
              />
              <q-input
                v-model="form.cpf_cnpj"
                :label="fisica ? 'CPF' : 'CNPJ'"
                :placeholder="fisica ? '000.000.000-00' : '00.000.000/0000-00'"
                inputmode="numeric"
                :mask="fisica ? '###.###.###-##' : '##.###.###/####-##'"
                unmasked-value
                outlined
                dense
                :readonly="!podeEditar"
                input-class="text-mono"
                class="col-12 col-sm-4"
              />
              <q-select
                v-model="form.contribuinte"
                :options="opcoesContribuinte"
                label="Contribuinte *"
                emit-value
                map-options
                outlined
                dense
                :readonly="!podeEditar"
                class="col-12 col-sm-8"
              />
              <q-input
                v-model="form.inscricao_estadual"
                :label="form.contribuinte === 1 ? 'Inscrição estadual *' : 'Inscrição estadual'"
                :placeholder="form.contribuinte === 2 ? 'Isento' : ''"
                maxlength="20"
                outlined
                dense
                :readonly="!podeEditar"
                :disable="form.contribuinte === 2"
                input-class="text-mono"
                class="col-12 col-sm-4"
              />
            </div>
          </div>

          <div>
            <div class="rotulo-coluna q-mb-sm">Endereço</div>
            <div class="row q-col-gutter-sm">
              <q-input
                v-model="form.cep"
                label="CEP"
                placeholder="00000-000"
                hint="Preenche o endereço sozinho"
                inputmode="numeric"
                mask="#####-###"
                unmasked-value
                outlined
                dense
                :readonly="!podeEditar"
                :loading="buscandoCep"
                input-class="text-mono"
                class="col-12 col-sm-4"
                @update:model-value="preencherPeloCep"
              />
              <q-select
                v-model="form.uf"
                :options="UFS"
                label="UF"
                outlined
                dense
                clearable
                :readonly="!podeEditar"
                class="col-4 col-sm-2"
              />
              <q-input
                v-model="form.cidade"
                label="Cidade"
                maxlength="100"
                outlined
                dense
                :readonly="!podeEditar"
                class="col-8 col-sm-6"
              />
              <q-input
                v-model="form.endereco"
                label="Endereço"
                placeholder="Rua, avenida…"
                maxlength="150"
                outlined
                dense
                :readonly="!podeEditar"
                class="col-12 col-sm-8"
              />
              <q-input
                v-model="form.numero"
                label="Número"
                maxlength="10"
                outlined
                dense
                :readonly="!podeEditar"
                class="col-4 col-sm-4"
              />
              <q-input
                v-model="form.bairro"
                label="Bairro"
                maxlength="100"
                outlined
                dense
                :readonly="!podeEditar"
                class="col-8 col-sm-6"
              />
              <q-input
                v-model="form.complemento"
                label="Complemento"
                maxlength="60"
                outlined
                dense
                :readonly="!podeEditar"
                class="col-12 col-sm-6"
              />
            </div>
          </div>

          <div>
            <div class="rotulo-coluna q-mb-sm">Contato</div>
            <div class="row q-col-gutter-sm">
              <q-input
                v-model="form.contato"
                label="Contato"
                placeholder="Nome de quem atende"
                maxlength="100"
                outlined
                dense
                :readonly="!podeEditar"
                class="col-12 col-sm-4"
              />
              <q-input
                v-model="form.telefone"
                label="Telefone"
                inputmode="tel"
                maxlength="20"
                outlined
                dense
                :readonly="!podeEditar"
                class="col-12 col-sm-4"
              />
              <q-input
                v-model="form.email"
                label="E-mail"
                type="email"
                maxlength="150"
                outlined
                dense
                :readonly="!podeEditar"
                class="col-12 col-sm-4"
              />
            </div>
          </div>

          <div>
            <div class="rotulo-coluna q-mb-sm">ICMS / ST</div>
            <div class="row q-col-gutter-sm items-center">
              <q-input
                v-model="form.icms"
                label="Aliq. ICMS"
                inputmode="decimal"
                suffix="%"
                outlined
                dense
                :readonly="!podeEditar"
                input-class="text-right text-mono"
                class="col-6 col-sm-3"
              />
              <q-input
                v-model="form.mva"
                label="MVA"
                inputmode="decimal"
                suffix="%"
                outlined
                dense
                :readonly="!podeEditar"
                input-class="text-right text-mono"
                class="col-6 col-sm-3"
              />
              <q-input
                v-model="form.ipi"
                label="Aliq. IPI"
                inputmode="decimal"
                suffix="%"
                outlined
                dense
                :readonly="!podeEditar"
                input-class="text-right text-mono"
                class="col-6 col-sm-3"
              />
              <div class="col-6 col-sm-3 column">
                <span class="texto-apoio" style="font-size: 12px">ST já recolhido?</span>
                <q-btn-toggle
                  v-model="form.stRecolhido"
                  :options="[
                    { label: 'Sim', value: true },
                    { label: 'Não', value: false }
                  ]"
                  :disable="!podeEditar"
                  no-caps
                  unelevated
                  dense
                  toggle-color="dark"
                  color="grey-3"
                  text-color="grey-9"
                  aria-label="ST já recolhido?"
                />
              </div>
            </div>
            <p class="texto-apoio q-mt-sm q-mb-none">
              <template v-if="form.stRecolhido">ST já vem recolhido: não soma no custo.</template>
              <template v-else>ST sobre a base: <strong class="text-mono">+{{ pct(store.stPercent(form)) }}</strong> do custo.</template>
              Custo efetivo = custo + IPI + ST, antes do markup. Quando o ST não vem recolhido: base do ST = (custo + IPI) × (1 + MVA) e
              ST = base do ST × alíquota de ICMS − ICMS próprio (custo × alíquota). Mudar estes valores refaz o preço dos produtos com
              preço automático.
            </p>
          </div>
        </q-card-section>

        <q-separator />
        <q-card-actions align="right" class="q-pa-md">
          <q-btn outline no-caps color="grey-8" :label="podeEditar ? 'Cancelar' : 'Fechar'" v-close-popup />
          <q-btn v-if="podeEditar" unelevated no-caps color="primary" label="Salvar fornecedor" :loading="dialogo.salvando" @click="salvar" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { mensagemDeErro } from '@/boot/axios'
import { useAuthStore } from '@/stores/auth'
import { useOficinaStore } from '@/stores/oficina'
import {
  TIPOS_PESSOA,
  CONTRIBUINTE,
  UFS,
  listarFornecedores,
  salvarFornecedor,
  excluirFornecedor,
  buscarCep,
  cpfCnpjTexto
} from '@/api/cadastros'
import { num, pct, paraTexto } from '@/utils/formato'

const $q = useQuasar()
const auth = useAuthStore()
const store = useOficinaStore()
const podeEditar = computed(() => auth.usuario?.papel === 'admin')

const fornecedores = ref([])
const carregando = ref(false)
const erro = ref('')
const busca = ref('')

const stDoFornecedor = (f) => store.stPercent({ stRecolhido: f.st_recolhido, mva: f.mva_percent, icms: f.icms_percent })

const colunas = [
  { name: 'nome', label: 'Fornecedor', field: 'nome', align: 'left' },
  { name: 'cpf_cnpj', label: 'CPF / CNPJ', field: 'cpf_cnpj', format: (v) => (v ? cpfCnpjTexto(v) : '—'), align: 'left', classes: 'text-mono' },
  { name: 'cidade', label: 'Cidade', field: (f) => [f.cidade, f.uf].filter(Boolean).join(' / ') || '—', align: 'left' },
  { name: 'contato', label: 'Contato', field: 'contato', align: 'left' },
  { name: 'icms', label: 'ICMS', field: 'icms_percent', format: pct, align: 'right', classes: 'text-mono' },
  { name: 'mva', label: 'MVA', field: 'mva_percent', format: pct, align: 'right', classes: 'text-mono' },
  { name: 'ipi', label: 'IPI', field: 'ipi_percent', format: pct, align: 'right', classes: 'text-mono' },
  { name: 'st', label: 'ST sobre a base', field: 'st_recolhido', align: 'right' },
  { name: 'acoes', label: '', field: 'id', align: 'right' }
]

// a lista é curta: a busca filtra aqui mesmo
const filtrados = computed(() => {
  const termo = (busca.value || '').trim().toLowerCase()
  if (!termo) return fornecedores.value
  const numeros = termo.replace(/\D/g, '')
  return fornecedores.value.filter(
    (f) =>
      f.nome.toLowerCase().includes(termo) ||
      (f.razao_social || '').toLowerCase().includes(termo) ||
      (numeros && (f.cpf_cnpj || '').includes(numeros))
  )
})

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    fornecedores.value = await listarFornecedores()
  } catch (e) {
    fornecedores.value = []
    erro.value = mensagemDeErro(e)
  } finally {
    carregando.value = false
  }
}

onMounted(carregar)

// as outras telas (estoque, notas de entrada, preço dos produtos) usam os fornecedores do store
function atualizarStore() {
  store.carregarConfiguracoes().catch(() => {})
}

// ---- janela de cadastro
const dialogo = reactive({ aberto: false, id: null, salvando: false, erro: '' })
const form = ref({})

const paraOpcoes = (mapa) => Object.entries(mapa).map(([value, label]) => ({ value, label }))
const opcoesTipoPessoa = paraOpcoes(TIPOS_PESSOA)
const opcoesContribuinte = paraOpcoes(CONTRIBUINTE).map((o) => ({ ...o, value: Number(o.value) }))
const fisica = computed(() => form.value.tipo_pessoa === 'fisica')

// CEP completo: preenche UF, cidade, bairro e endereço (número e complemento ficam como estão)
const buscandoCep = ref(false)
async function preencherPeloCep(cep) {
  if (!cep || cep.length !== 8) return
  buscandoCep.value = true
  const achado = await buscarCep(cep)
  buscandoCep.value = false
  // o CEP pode ter mudado enquanto buscava
  if (!achado || form.value.cep !== cep) return
  Object.assign(form.value, achado)
}

function abrir(f) {
  dialogo.id = f?.id ?? null
  form.value = f
    ? {
        nome: f.nome,
        razao_social: f.razao_social || '',
        tipo_pessoa: f.tipo_pessoa,
        cpf_cnpj: f.cpf_cnpj || '',
        contribuinte: f.contribuinte,
        inscricao_estadual: f.inscricao_estadual || '',
        cep: f.cep || '',
        uf: f.uf || null,
        cidade: f.cidade || '',
        bairro: f.bairro || '',
        endereco: f.endereco || '',
        numero: f.numero || '',
        complemento: f.complemento || '',
        contato: f.contato || '',
        telefone: f.telefone || '',
        email: f.email || '',
        icms: paraTexto(f.icms_percent),
        mva: paraTexto(f.mva_percent),
        ipi: paraTexto(f.ipi_percent),
        stRecolhido: f.st_recolhido
      }
    : {
        nome: '',
        razao_social: '',
        tipo_pessoa: 'juridica',
        cpf_cnpj: '',
        contribuinte: 1,
        inscricao_estadual: '',
        cep: '',
        uf: null,
        cidade: '',
        bairro: '',
        endereco: '',
        numero: '',
        complemento: '',
        contato: '',
        telefone: '',
        email: '',
        icms: '0',
        mva: '0',
        ipi: '0',
        stRecolhido: true
      }
  dialogo.aberto = true
}

async function salvar() {
  const f = form.value
  dialogo.erro = ''
  if (!f.nome.trim()) {
    dialogo.erro = 'Informe o nome do fornecedor.'
    return
  }
  const tamanhoDoc = f.tipo_pessoa === 'fisica' ? 11 : 14
  if (f.cpf_cnpj && f.cpf_cnpj.length !== tamanhoDoc) {
    dialogo.erro = f.tipo_pessoa === 'fisica' ? 'O CPF precisa ter 11 números.' : 'O CNPJ precisa ter 14 números.'
    return
  }
  if (!f.contribuinte) {
    dialogo.erro = 'Escolha se o fornecedor é contribuinte do ICMS.'
    return
  }
  if (f.contribuinte === 1 && !f.inscricao_estadual.trim()) {
    dialogo.erro = 'Contribuinte do ICMS precisa da inscrição estadual.'
    return
  }
  if (f.cep && f.cep.length !== 8) {
    dialogo.erro = 'O CEP precisa ter 8 números.'
    return
  }
  dialogo.salvando = true
  try {
    await salvarFornecedor(dialogo.id, {
      nome: f.nome.trim(),
      razao_social: f.razao_social,
      tipo_pessoa: f.tipo_pessoa,
      cpf_cnpj: f.cpf_cnpj,
      contribuinte: f.contribuinte,
      inscricao_estadual: f.contribuinte === 2 ? '' : f.inscricao_estadual,
      cep: f.cep,
      uf: f.uf,
      cidade: f.cidade,
      bairro: f.bairro,
      endereco: f.endereco,
      numero: f.numero,
      complemento: f.complemento,
      contato: f.contato,
      telefone: f.telefone,
      email: f.email,
      icms_percent: num(f.icms),
      mva_percent: num(f.mva),
      ipi_percent: num(f.ipi),
      st_recolhido: !!f.stRecolhido
    })
    dialogo.aberto = false
    $q.notify({ message: 'Fornecedor salvo.', color: 'positive', icon: 'check', position: 'top' })
    carregar()
    atualizarStore()
  } catch (e) {
    dialogo.erro = mensagemDeErro(e)
  } finally {
    dialogo.salvando = false
  }
}

function excluir(f) {
  $q.dialog({
    title: 'Excluir ' + f.nome + '?',
    message: 'Ele sai das listas de escolha. Produtos e notas que já usam este fornecedor continuam com o nome e o preço.',
    ok: { label: 'Excluir', color: 'negative', unelevated: true, noCaps: true },
    cancel: { label: 'Cancelar', flat: true, noCaps: true, color: 'grey-8' },
    persistent: true
  }).onOk(async () => {
    try {
      await excluirFornecedor(f.id)
      $q.notify({ message: 'Fornecedor excluído.', color: 'dark' })
      carregar()
      atualizarStore()
    } catch (e) {
      $q.notify({ message: mensagemDeErro(e), color: 'negative', position: 'top' })
    }
  })
}
</script>
