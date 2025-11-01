// Importações Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Configuração Firebase (sua)
const firebaseConfig = {
  apiKey: "AIzaSyBRuvYrZLMLRdV5ckKT-0r-hXsgO7umKDE",
  authDomain: "controle-estoque-b3040.firebaseapp.com",
  projectId: "controle-estoque-b3040",
  storageBucket: "controle-estoque-b3040.firebasestorage.app",
  messagingSenderId: "382920463140",
  appId: "1:382920463140:web:836453ff63c47b8fb159b1",
  measurementId: "G-TWDYX1DND1"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Função para formatar número para Real
function formatarValor(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Atualiza automaticamente o campo "mês" ao escolher a data
document.getElementById("data").addEventListener("change", (e) => {
  const data = new Date(e.target.value);
  const mes = data.toLocaleString("pt-BR", { month: "long", year: "numeric" });
  document.getElementById("mes").value = mes.charAt(0).toUpperCase() + mes.slice(1);
});

// Salvar lançamento
document.getElementById("formLancamento").addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = document.getElementById("data").value;
  const mes = document.getElementById("mes").value;
  const categoria = document.getElementById("categoria").value;
  const descricao = document.getElementById("descricao").value;
  const valor = parseFloat(document.getElementById("valor").value);

  try {
    await addDoc(collection(db, "lancamentos"), {
      data,
      mes,
      categoria,
      descricao,
      valor,
      timestamp: new Date()
    });

    alert("Lançamento salvo com sucesso!");
    document.getElementById("formLancamento").reset();
    document.getElementById("mes").value = "";
    carregarLancamentos();
    carregarControle();
  } catch (error) {
    console.error("Erro ao salvar:", error);
    alert("Erro ao salvar o lançamento.");
  }
});

// Carregar lançamentos do Firestore
async function carregarLancamentos() {
  const tabela = document.getElementById("tabelaLancamentos");
  tabela.innerHTML = "";
  const q = query(collection(db, "lancamentos"), orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(q);

  querySnapshot.forEach((doc) => {
    const lanc = doc.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${new Date(lanc.data).toLocaleDateString("pt-BR")}</td>
      <td>${lanc.mes}</td>
      <td>${lanc.categoria}</td>
      <td>${lanc.descricao}</td>
      <td>${formatarValor(lanc.valor)}</td>
    `;
    tabela.appendChild(tr);
  });
}

// Carregar controle mensal
async function carregarControle() {
  const controle = {};
  const querySnapshot = await getDocs(collection(db, "lancamentos"));

  querySnapshot.forEach((doc) => {
    const lanc = doc.data();
    const mes = lanc.mes;
    if (!controle[mes]) controle[mes] = { renda: 0, gasto: 0, categorias: {} };

    const isRenda = ["Salário", "Renda Extra"].includes(lanc.categoria);
    if (isRenda) {
      controle[mes].renda += lanc.valor;
    } else {
      controle[mes].gasto += lanc.valor;
    }

    // Contar frequência de categorias
    if (!controle[mes].categorias[lanc.categoria])
      controle[mes].categorias[lanc.categoria] = 0;
    controle[mes].categorias[lanc.categoria]++;
  });

  const tabela = document.getElementById("tabelaControle");
  tabela.innerHTML = "";

  Object.entries(controle).forEach(([mes, valores]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${mes}</td>
      <td>${formatarValor(valores.renda)}</td>
      <td>${formatarValor(valores.gasto)}</td>
    `;
    tabela.appendChild(tr);

    // Categoria mais frequente
    const categorias = Object.entries(valores.categorias);
    if (categorias.length > 0) {
      const [categoriaMais, qtd] = categorias.sort((a, b) => b[1] - a[1])[0];
      const freqInfo = document.createElement("tr");
      freqInfo.innerHTML = `
        <td colspan="3" class="text-muted small text-center">
          Categoria mais frequente: <b>${categoriaMais}</b> (${qtd}x)
        </td>
      `;
      tabela.appendChild(freqInfo);
    }
  });
}

// Inicialização
carregarLancamentos();
carregarControle();
