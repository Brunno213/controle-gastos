// ======== CONFIGURAÇÃO FIREBASE ========
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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

// ======== FORMULÁRIO E AÇÕES ========
const form = document.getElementById("formLancamento");
const tabela = document.getElementById("tabelaLancamentos");
const controleTabela = document.getElementById("tabelaControle");

const dataInput = document.getElementById("data");
const mesInput = document.getElementById("mes");

dataInput.addEventListener("change", () => {
  const data = new Date(dataInput.value);
  const mes = data.toLocaleString('pt-BR', { month: 'long' });
  mesInput.value = mes.charAt(0).toUpperCase() + mes.slice(1);
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = dataInput.value;
  const mes = mesInput.value;
  const categoria = document.getElementById("categoria").value;
  const descricao = document.getElementById("descricao").value;
  const valor = parseFloat(document.getElementById("valor").value);

  try {
    await addDoc(collection(db, "lancamentos"), { data, mes, categoria, descricao, valor });
    alert("Lançamento salvo com sucesso!");
    form.reset();
    carregarLancamentos();
  } catch (error) {
    console.error("Erro ao salvar:", error);
  }
});

// ======== CARREGAR LANÇAMENTOS ========
async function carregarLancamentos() {
  tabela.innerHTML = "";
  const querySnapshot = await getDocs(collection(db, "lancamentos"));

  const controle = {};

  querySnapshot.forEach((doc) => {
    const item = doc.data();

    // tabela extrato
    const linha = document.createElement("tr");
    linha.innerHTML = `
      <td>${item.data}</td>
      <td>${item.mes}</td>
      <td>${item.categoria}</td>
      <td>${item.descricao}</td>
      <td>${item.valor.toFixed(2)}</td>
    `;
    tabela.appendChild(linha);

    // controle mensal
    if (!controle[item.mes]) {
      controle[item.mes] = { renda: 0, gasto: 0 };
    }

    if (["Salário", "Renda Extra"].includes(item.categoria)) {
      controle[item.mes].renda += item.valor;
    } else {
      controle[item.mes].gasto += item.valor;
    }
  });

  controleTabela.innerHTML = "";
  for (const mes in controle) {
    const linha = document.createElement("tr");
    linha.innerHTML = `
      <td>${mes}</td>
      <td>R$ ${controle[mes].renda.toFixed(2)}</td>
      <td>R$ ${controle[mes].gasto.toFixed(2)}</td>
    `;
    controleTabela.appendChild(linha);
  }
}

// Alternar entre menus
document.getElementById("menuExtrato").addEventListener("click", () => {
  document.getElementById("extratoSection").style.display = "block";
  document.getElementById("controleSection").style.display = "none";
});
document.getElementById("menuControle").addEventListener("click", () => {
  document.getElementById("extratoSection").style.display = "none";
  document.getElementById("controleSection").style.display = "block";
  carregarLancamentos();
});

// Carrega ao abrir
carregarLancamentos();
