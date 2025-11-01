// ======== IMPORTS DO FIREBASE ========
import { 
  initializeApp 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { 
  getAuth, GoogleAuthProvider, signInWithPopup, signOut 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// ======== CONFIGURAÇÃO DO FIREBASE ========
const firebaseConfig = {
  apiKey: "AIzaSyBRuvYrZLMLRdV5ckKT-0r-hXsgO7umKDE",
  authDomain: "controle-estoque-b3040.firebaseapp.com",
  projectId: "controle-estoque-b3040",
  storageBucket: "controle-estoque-b3040.firebasestorage.app",
  messagingSenderId: "382920463140",
  appId: "1:382920463140:web:836453ff63c47b8fb159b1",
  measurementId: "G-TWDYX1DND1"
};

// ======== INICIALIZAÇÃO ========
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let usuarioLogado = null;
let lancamentos = [];
let editIndex = null;

// ======== LOGIN GOOGLE ========
document.getElementById("btnLogin").addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    usuarioLogado = result.user;
    document.getElementById("userName").innerText = usuarioLogado.displayName;
    document.getElementById("btnLogin").style.display = "none";
    document.getElementById("btnLogout").style.display = "inline-block";
    await carregarLancamentos();
  } catch (e) {
    alert("Erro ao fazer login: " + e.message);
  }
});

document.getElementById("btnLogout").addEventListener("click", async () => {
  await signOut(auth);
  usuarioLogado = null;
  document.getElementById("userName").innerText = "";
  document.getElementById("btnLogin").style.display = "inline-block";
  document.getElementById("btnLogout").style.display = "none";
  document.getElementById("tabelaBody").innerHTML = "";
});

// ======== FIRESTORE ========
async function carregarLancamentos() {
  if (!usuarioLogado) return;
  lancamentos = [];
  const querySnapshot = await getDocs(collection(db, `usuarios/${usuarioLogado.uid}/lancamentos`));
  querySnapshot.forEach((docSnap) => {
    lancamentos.push({ id: docSnap.id, ...docSnap.data() });
  });
  atualizarTabela();
  atualizarControle();
}

async function salvarLancamento(lancamento) {
  if (!usuarioLogado) return;
  await addDoc(collection(db, `usuarios/${usuarioLogado.uid}/lancamentos`), lancamento);
  await carregarLancamentos();
}

async function atualizarLancamento(id, dados) {
  await updateDoc(doc(db, `usuarios/${usuarioLogado.uid}/lancamentos`, id), dados);
  await carregarLancamentos();
}

async function excluirLancamento(id) {
  await deleteDoc(doc(db, `usuarios/${usuarioLogado.uid}/lancamentos`, id));
  await carregarLancamentos();
}

// ======== FORMULÁRIO ========
document.getElementById("data").addEventListener("change", (e) => {
  const data = new Date(e.target.value);
  if (!isNaN(data)) {
    const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    document.getElementById("mes").value = meses[data.getMonth()];
  }
});

document.getElementById("formLancamento").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!usuarioLogado) {
    alert("Por favor, faça login antes de salvar.");
    return;
  }

  const data = document.getElementById("data").value;
  const mes = document.getElementById("mes").value;
  const categoria = document.getElementById("categoria").value;
  const descricao = document.getElementById("descricao").value;
  const valor = parseFloat(document.getElementById("valor").value);

  const novo = { data, mes, categoria, descricao, valor };

  if (editIndex === null) {
    await salvarLancamento(novo);
  } else {
    await atualizarLancamento(lancamentos[editIndex].id, novo);
    editIndex = null;
  }

  e.target.reset();
});

// ======== TABELA ========
function atualizarTabela() {
  const corpo = document.getElementById("tabelaBody");
  corpo.innerHTML = "";
  lancamentos.forEach((l, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${l.data}</td>
      <td>${l.mes}</td>
      <td>${l.categoria}</td>
      <td>${l.descricao}</td>
      <td>R$ ${l.valor.toFixed(2)}</td>
      <td>
        <button class="btn btn-warning btn-sm" onclick="editar(${i})">Editar</button>
        <button class="btn btn-danger btn-sm" onclick="excluir(${i})">Excluir</button>
      </td>
    `;
    corpo.appendChild(tr);
  });
  atualizarControle();
}

window.editar = function(i) {
  const l = lancamentos[i];
  document.getElementById("data").value = l.data;
  document.getElementById("mes").value = l.mes;
  document.getElementById("categoria").value = l.categoria;
  document.getElementById("descricao").value = l.descricao;
  document.getElementById("valor").value = l.valor;
  editIndex = i;
};

window.excluir = async function(i) {
  if (confirm("Deseja excluir este lançamento?")) {
    await excluirLancamento(lancamentos[i].id);
  }
};

// ======== CONTROLE (COMPARATIVO DE RENDAS E GASTOS) ========
function atualizarControle() {
  const meses = {};
  lancamentos.forEach(l => {
    if (!meses[l.mes]) meses[l.mes] = { renda: 0, gasto: 0 };
    if (["salario", "renda extra", "dízimo"].includes(l.categoria.toLowerCase())) {
      meses[l.mes].renda += l.valor;
    } else {
      meses[l.mes].gasto += l.valor;
    }
  });

  const tabela = document.getElementById("controleBody");
  tabela.innerHTML = "";
  for (const mes in meses) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${mes}</td>
      <td>R$ ${meses[mes].renda.toFixed(2)}</td>
      <td>R$ ${meses[mes].gasto.toFixed(2)}</td>
    `;
    tabela.appendChild(tr);
  }
}

