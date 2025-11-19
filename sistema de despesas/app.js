const descricao = document.getElementById("descricao");
const categoria = document.getElementById("categoria");
const valor = document.getElementById("valor");
const data = document.getElementById("data");
const tBody = document.querySelector("tbody");
const form = document.querySelector("form");

const btnSubmit = document.querySelector(".btn-submit");

const selectFiltroCategoria = document.getElementById("filtro-categoria");
const inputDataInicio = document.getElementById("filtro-data-inicio");
const inputDataFim = document.getElementById("filtro-data-fim");
const btnFiltrar = document.getElementById("btn-filtrar");
const btnLimparFiltros = document.getElementById("btn-limpar-filtros");

let despesas = JSON.parse(localStorage.getItem("despesas")) || [];

function salvarNoStorage () {
  localStorage.setItem("despesas", JSON.stringify(despesas))
}

let graficosDespesas = null;
let editarDespesas = null;

function adicionarNaTabela(despesa) {
  const tr = document.createElement("tr");
  tr.classList.add("row100", "body");
  tr.dataset.id = despesa.id;

  tr.innerHTML = `
    <td class="cell100 column1">${despesa.descricao}</td>
    <td class="cell100 column2">${despesa.categoria}</td>
    <td class="cell100 column3">R$ ${despesa.valor}</td>
    <td class="cell100 column4">${formatarData(despesa.data)}</td>
    <td class="cell100 column5">
      <button class="btn-editar">Editar</button>
      <button class="btn-excluir">Excluir</button>
    </td>
  `;

  tBody.appendChild(tr);
}

function renderizarTabela(lista = despesas) {
  tBody.innerHTML = "";

  lista.forEach(despesa => {
    adicionarNaTabela(despesa)
  });

  atualizarTotal(lista)
  atualizarGrafico(lista);
  atualizarOpcoesCategoria();
}

function atualizarTotal(lista = despesas) {
  const totalDespesa = document.getElementById("total-despesa");
  
  if(!totalDespesa) return;
  
  const total = lista.reduce((acc, despesa) => {
    const valorNumero = parseValorBR(despesa.valor)
    
    if(isNaN(valorNumero)) return acc;
    return acc += valorNumero
  },0)
  
  totalDespesa.textContent = `R$ ${total.toFixed(2)}`;
}

function calcularGastosPorCategoria(lista = despesas) {
  const totais = {};

  lista.forEach((despesa) => {
    const categoria = despesa.categoria || "Sem categoria";

    const valorNumero = parseValorBR(despesa.valor)

    if(isNaN(valorNumero)) return;

    if(!totais[categoria]) {
      totais[categoria] = 0;
    }

    totais[categoria] += valorNumero;
  })

  const labels = Object.keys(totais);
  const valores = Object.values(totais)

  return {labels, valores};
}

function atualizarOpcoesCategoria () {
  if(!selectFiltroCategoria) return;

  const categoriasUnicas = [...new Set(
    despesas.map((d) => d.categoria).filter(Boolean)
  )]

  selectFiltroCategoria.innerHTML = `<option value="">Todas</option>`

  categoriasUnicas.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    selectFiltroCategoria.appendChild(option);
  })
}

tBody.addEventListener('click', e => {
  const botao = e.target;

  const linha = botao.closest('tr');
  if(!linha) return;

  const id = Number(linha.dataset.id);

  if (botao.classList.contains("btn-excluir")) {
    despesas = despesas.filter((d) => d.id !== id)

    salvarNoStorage();
    renderizarTabela();
    return;
  }

  if(botao.classList.contains("btn-editar")) {
    const despesa = despesas.find((d) => d.id === id);

    if(!despesa) return;

    descricao.value = despesa.descricao;
    categoria.value = despesa.categoria;
    valor.value = despesa.valor
    data.value = despesa.data;

    editarDespesas = id;

    btnSubmit.textContent = "Salvar Edição";
  }
})

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const dados = {
    descricao: descricao.value.trim(),
    categoria: categoria.value.trim(),
    valor: valor.value.trim(),
    data: data.value,
  }

  if(editarDespesas !== null) {
    const index = despesas.findIndex((d) => d.id === editarDespesas)

    if(index !== -1) {
      despesas[index] ={
        ...despesas[index],
        ...dados
      }
    }

    editarDespesas = null;
    btnSubmit.textContent = "Enviar"
    salvarNoStorage();
    renderizarTabela();
    form.reset();
    descricao.focus();
    return;
  }
  
  const novaDespesa = {
    id: Date.now(),
    ...dados
  }

  despesas.push(novaDespesa);
  salvarNoStorage();
  renderizarTabela();

  form.reset();
  descricao.focus();
})

btnFiltrar.addEventListener("click", () => {
  const categoriaSelecionada = selectFiltroCategoria.value;
  const dataInicio = inputDataInicio.value;
  const dataFim = inputDataFim.value;

  const filtradas = despesas.filter((d) => {
    if(categoriaSelecionada && d.categoria !== categoriaSelecionada) {
      return false;
    }

    if(dataInicio && d.data < dataInicio) {
      return false
    }

    if(dataFim && d.data > dataFim) {
      return false
    }

    return true;
  })

  renderizarTabela(filtradas);
})

btnLimparFiltros.addEventListener("click", () => {
  selectFiltroCategoria.value = "";
  inputDataInicio.value = "";
  inputDataFim.value = "";

  renderizarTabela(despesas)
})

function atualizarGrafico(lista = despesas) {
  const canvas = document.getElementById("graficoDespesas");
  if (!canvas) return;

  canvas.width = 800;
  canvas.height = 400;
  
  
  const ctx = canvas.getContext("2d");
  
  const {labels, valores} = calcularGastosPorCategoria(lista);
  
  const cores = gerarCores(labels.length)
  
  if (!graficosDespesas) {
    graficosDespesas = new Chart(ctx, {
      type: "pie",
      data: {
        labels,
        datasets: [
          {
            label: "Total por categoria (R$)",
            data: valores,
            backgroundColor: cores,
            borderColor: cores.map((c) => c.replace("0.7", "1")),
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: false,
        scales: {
          y: { beginAtZero: true },

        },
      },
    });
  } else {
    graficosDespesas.data.labels = labels;
    graficosDespesas.data.datasets[0].data = valores;
    graficosDespesas.data.datasets[0].backgroundColor = cores;
    graficosDespesas.data.datasets[0].borderColor = cores.map((c) =>
      c.replace("0.7", "1")
    );
    graficosDespesas.update();
  }
}

function gerarCores(quantidade) {
  const cores = [];
  
  for (let i = 0; i < quantidade; i++) {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    
    cores.push(`rgba(${r}, ${g}, ${b}, 0.7)`)
  }
  
  return cores;
}

function parseValorBR(valor) {
  return parseFloat(
    String(valor)
    .replace("R$", "")
    .replace(/\./g, "")
    .replace(",", ".")
  )
}

function converterBRL(valor) {
  valor = valor.replace(/\D/g, "");
  
  if (valor === "") return "";
  
  valor = (Number(valor) / 100).toFixed(2) + "";
  
  valor = valor.replace(".", ",");
  valor = valor.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return valor;
}

function formatarData(iso) {
  if(!iso) return "";
  
  const [ano, mes, dia] = iso.split("-");
  
  return `${dia}/${mes}/${ano}`;
}

valor.addEventListener("input", () => {
  valor.value = converterBRL(valor.value);
})

renderizarTabela(despesas);

//copyright

function copyright() {
  const copyright = document.getElementById("copyright");

  let data = new Date();
  let year = data.getFullYear();

  copyright.textContent = `© Todos os direitos reservados Caio - ${year}`
}

copyright();