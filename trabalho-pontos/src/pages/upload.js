import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, increment, getDoc, setDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, storage, db } from '../firebase/firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export default function Upload() {
  const [file, setFile] = useState([]); 
  const [reason, setReason] = useState(""); 
  const [uploadProgress, setUploadProgress] = useState(0);
  const [userId, setUserId] = useState("")
  const [userPoints, setUserPoints] = useState(0);
  const [rejectingFileId, setRejectingFileId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState([]);
  const [deductPoints, setDeductPoints] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [rejectedFileId, setRejectedFileId] = useState(null); 
  const taskLabel = selectedTask ? selectedTask?.label : '';
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [loading, setLoading] = useState(false)
  const router = useRouter();

  const tasks = [
    { id: 1, label: 'Redação dissertativa-argumentativa sobre "A persistência da violência contra a mulher no Brasil - 12 pontos".', points: 12 },
    { id: 2, label: 'Resolva e envie uma lista de exercícios de matemática sobre "Progressões aritméticas e geométricas - 8 pontos".', points: 8 },
    { id: 3, label: 'Resumo das principais características do movimento literário "Modernismo" no Brasil - 10 pontos.', points: 10 },
    { id: 4, label: 'Síntese sobre os principais aspectos da "Revolução Francesa" e sua influência no mundo - 9 pontos.', points: 9 },
    { id: 5, label: 'Análise crítica do filme "Que Horas Ela Volta?" relacionando-o com a questão da desigualdade social no Brasil - 11 pontos.', points: 11 },
    { id: 6, label: 'Exercícios de química sobre "Reações Redox e Eletroquímica" - 7 pontos.', points: 7 },
    { id: 7, label: 'Escreva um ensaio sobre "Os desafios da mobilidade urbana nas grandes cidades brasileiras" - 10 pontos.', points: 10 },
    { id: 8, label: 'Resumo dos temas de biologia mais recorrentes nas provas do ENEM, focando em ecologia e genética - 9 pontos.', points: 9 },
    { id: 9, label: 'Mapa mental sobre "Os principais períodos da história do Brasil", destacando as características de cada período - 10 pontos.', points: 10 },
    { id: 10, label: 'Resenha crítica sobre o livro "Vidas Secas" de Graciliano Ramos, com foco na crítica social presente na obra - 11 pontos.', points: 11 }
  ];

  useEffect(() => {
    const checkSession = () => {
      const loginTime = localStorage.getItem('loginTime');
      const currentTime = Date.now();
      const sessionDuration = 30 * 60 * 1000; // 30 minutos em milissegundos
  
      if (loginTime && (currentTime - loginTime < sessionDuration)) {
        onAuthStateChanged(auth, (user) => {
          if (!user) {
            router.push('/login');
          } else {
            if (user.email === 'admin@email.com') {
              setIsAdmin(true);
              fetchUsers();
              fetchUploadedFiles();
            } else {
              setIsAdmin(false);
              setUserId(user.uid)
              fetchUserPoints(user.uid); // Atualiza os pontos do usuário
              fetchUploadedFilesForUser(user.uid);
              fetchFileStatusForUser(user.uid);
            }
          }
        });
      } else {
        localStorage.removeItem('loginTime');
        router.push('/login');
      }
    };
  
    checkSession();
  }, [router]);
  
  const fetchUserPoints = async (userId) => {
    const userDoc = doc(db, 'users', userId);
    const userSnap = await getDoc(userDoc);
    if (userSnap.exists()) {
      setUserPoints(userSnap.data().points || 0);
    }
  };

  const updateUserPoints = async (fileId, newStatus) => {
    const fileRef = doc(db, 'uploadedFiles', fileId);
    const fileSnap = await getDoc(fileRef);
    
    if (fileSnap.exists()) {
      const fileData = fileSnap.data();
      const points = extractPointsFromDescription(fileData.fileName);
  
      if (fileData.status !== newStatus) {
        if (newStatus === 'Aceito') {
          await handleAdjustPoints(points, 'add');
        } else if (newStatus === 'Rejeitado') {
          await handleAdjustPoints(points, 'deduct');
        }
      }
      
      if (selectedUserId) {
        fetchUserPoints(selectedUserId); // Atualiza os pontos do usuário
      }
    }
  };
  
  const fetchUsers = async () => {
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    const usersList = usersSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setUsers(usersList);
  };
  useEffect(() => {
  }, [users]); 
  const fetchUploadedFiles = async () => {
    try {
      setLoading(true)
      const filesRef = collection(db, 'uploadedFiles');
      const filesSnap = await getDocs(filesRef);
      const filesList = await Promise.all(filesSnap.docs.map(async (doc) => {
        const fileData = doc.data();
        const downloadURL = await getDownloadURL(ref(storage, `uploads/${fileData.fileName}`));
        return {
          id: doc.id,
          ...fileData,
          downloadURL
        };
      }));
      setUploadedFiles(filesList);
      setLoading(false)
    } catch (error) {
      setLoading(false)
      console.error('Erro ao buscar arquivos:', error);
    }
  };
  
  const handleRejectClick = (fileId) => {
    setShowRejectInput(true)
    setRejectedFileId(fileId)
    setRejectingFileId(fileId);
  };
  

  const handleSubmitReject = async (fileId) => {
    if (!reason) {
      alert("Por favor, insira um motivo para a rejeição.");
      return;
    }
    try {
      await handleUpdateStatus(fileId, 'Rejeitado');
      const fileRef = doc(db, 'uploadedFiles', rejectedFileId);
      await updateDoc(fileRef, { status: "Rejeitado", rejectionReason: reason });
      setUploadedFiles(prevFiles =>
        prevFiles.map(file =>
          file.id === rejectedFileId ? { ...file, status: "Rejeitado", rejectionReason: reason } : file
        )
      );
      setRejectedFileId(null);
      setShowRejectInput(false)
      setReason("");
    } catch (error) {
      console.error("Erro ao rejeitar o arquivo:", error);
    }
  };
  const handleAcceptClick = async (fileId) => {
    setShowRejectInput(false)
    await handleUpdateStatus(fileId, 'Aceito');
  };
  const handleFinalizarClick = async (fileId) => {
    setShowRejectInput(false)
    await handleUpdateStatus(fileId, 'Finalizado');
  };
  const [updateFlag, setUpdateFlag] = useState(false);
  const extractPointsFromDescription = (description) => {
    // Verifica se a descrição é uma string
    if (typeof description !== 'string') {
      throw new Error('Descrição deve ser uma string.');
    }
  
    // Expressão regular para encontrar o número antes da palavra "pontos"
    const match = description.match(/(\d+)\s+pontos/);
  
    // Verifica se encontrou uma correspondência
    if (match) {
      // O número está no primeiro grupo de captura
      return parseInt(match[1], 10);
    } else {
      // Se não encontrou a correspondência, retorna 0 ou outro valor padrão
      return 0;
    }
  };
  
  // Exemplo de uso
  const fileName = 'Análise crítica do filme "Que - 11 pontos - BodyFat_AIPrancheta 7 1.png"';
  const points = extractPointsFromDescription(fileName);
  
  const handleUpdateStatus = async (fileId, status) => {
    try {
      const fileRef = doc(db, 'uploadedFiles', fileId);
      const fileSnap = await getDoc(fileRef);
      if (fileSnap.exists()) {
        const fileData = fileSnap.data();
        if(fileData.status !== status){
          const points = extractPointsFromDescription(fileId);
          if (fileData.status === "Rejeitado" && status === "Aceito") {
            handleAdjustPoints(points, "add");
          } else if (fileData.status === "Aceito" && status === "Rejeitado") {
            handleAdjustPoints(points, "deduct");
          } else if (fileData.status === "Em Análise" && status === "Aceito") {
            handleAdjustPoints(points, "add");
          } else if (fileData.status === "Aceito" && status === "Finalizado") {
            handleAdjustPoints(points, "deduct");
          } else if (fileData.status === "Finalizado" && status === "Aceito") {
            alert('Documento já foi finalizado.');
            setShowRejectInput(false)
            return
          } else if (fileData.status === "Finalizado" && status === "Rejeitado") {
            alert('Documento já foi finalizado.');
            setShowRejectInput(false)
            return
          }
        }
      } else {
        console.log("Documento não encontrado.");
      }
        await updateDoc(fileRef, { status });
        await updateUserPoints(fileId, status);
        await fetchUsers(); // Buscando os usuários atualizados após as mudanças
        setUpdateFlag(prev => !prev); // Alterna o flag para forçar a re-renderização
    } catch (error) {
      console.error("Erro ao atualizar o status:", error);
    }
  };
  
  useEffect(() => {
    fetchUploadedFiles(); // Atualiza arquivos sempre que o updateFlag mudar
  }, [updateFlag]);
  
  const fetchUploadedFilesForUser = async (userId) => {
    const filesRef = collection(db, 'uploadedFiles');
    const q = query(filesRef, where('userId', '==', userId));
    const filesSnap = await getDocs(q);
  
    const filesList = await Promise.all(filesSnap.docs.map(async (doc) => {
      const fileData = doc.data();
      const fileRef = ref(storage, `uploads/${fileData.fileName}`);
      try {
        // Verificar o caminho do arquivo
        const downloadURL = await getDownloadURL(fileRef);
        return {
          id: doc.id,
          ...fileData,
          downloadURL
        };
      } catch (error) {
        console.error(`Error fetching URL for file: ${fileData.fileName}`, error);
        // Você pode optar por retornar algo aqui, como um objeto com erro
        return {
          id: doc.id,
          ...fileData,
          downloadURL: null,
          error: 'File not found'
        };
      }
    }));
  
    setUploadedFiles(filesList);
  };
  useEffect(() => {
    if (!isAdmin && auth.currentUser) {
      fetchUploadedFilesForUser(auth.currentUser.uid);
    } else if (isAdmin) {
      fetchUploadedFiles(); // Administrador pode ver todos os arquivos
    }
  }, [isAdmin, auth.currentUser]);
  
  
  // Verifique o estado local para arquivos
  useEffect(() => {
    if (!isAdmin && auth.currentUser) {
      fetchUploadedFilesForUser(auth.currentUser.uid);
    }
  }, [isAdmin, auth.currentUser]);
  

  const fetchFileStatusForUser = async (userId) => {
    const filesRef = collection(db, 'uploadedFiles');
    const q = query(filesRef, where('userId', '==', userId));
    const filesSnap = await getDocs(q);
    const statusMap = {};
    filesSnap.docs.forEach(doc => {
      const fileData = doc.data();
      statusMap[fileData.id] = fileData.status;
    });
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
  };
  const handleDownload = async (fileId) => {
    try {
      // Obtém a URL do download do Firebase Storage para o arquivo com o ID fornecido
      const fileRef = doc(db, 'uploadedFiles', fileId);
      const fileSnap = await getDoc(fileRef);
      
      if (fileSnap.exists()) {
        const fileData = fileSnap.data();
        const fileURL = await getDownloadURL(ref(storage, `uploads/${fileData.fileName}`));
        
        // Cria um link temporário e aciona o download
        const link = document.createElement('a');
        link.href = fileURL;
        link.download = fileData.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert('Arquivo não encontrado.');
      }
    } catch (error) {
      console.error('Erro ao baixar o arquivo:', error);
    }
  };
  const handleUpload = async () => {
    if (file && selectedTask && file.size > 0) {
      const taskLabel = selectedTask.label.trim();
      const taskPoints = selectedTask.points;
      const taskLabelWords = taskLabel.split(' ').slice(0, 5).join(' ');
      const newFileName = `${taskLabelWords} - ${taskPoints} pontos - ${file.name}`;
      const storageRef = ref(storage, `uploads/${newFileName}`);
  
      try {
        const uploadTask = uploadBytesResumable(storageRef, file);
  
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => {
            console.error('Upload failed:', error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            const newFileDoc = doc(db, 'uploadedFiles', `${auth.currentUser.uid}_${newFileName}`);
            await setDoc(newFileDoc, {
              fileName: newFileName,
              userId: auth.currentUser.uid,
              uploadTime: new Date(),
              taskId: selectedTask.id,
              status: 'Em Análise'
            });
            alert('Arquivo enviado com sucesso!');
            setFile(null);
            setSelectedTask(null);
            fetchUploadedFiles(); // Recarregar arquivos após o upload
          }
        );
      } catch (error) {
        console.error('Error during upload:', error);
      }
    } else {
      alert('Selecione um arquivo e escolha uma tarefa.');
    }
  };
  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('loginTime');
      router.push('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handleAdjustPoints = async (pointsToAdjust, action) => {
    if (selectedUserId && pointsToAdjust) {
      try {
        // Garantir que pointsToAdjust seja um número válido
        const points = parseInt(pointsToAdjust, 10);
        if (isNaN(points) || points <= 0) {
          alert('Por favor, insira um número válido de pontos.');
          return;
        }
  
        const userDoc = doc(db, 'users', selectedUserId);
        const userSnap = await getDoc(userDoc);
        if (userSnap.exists()) {
          const currentPoints = userSnap.data().points || 0;
  
          if (action === 'deduct') {
            if (currentPoints < points) {
              alert('O usuário não tem pontos suficientes para deduzir.');
              return;
            }
            await updateDoc(userDoc, {
              points: increment(-points)
            });
            alert('Pontos deduzidos com sucesso!');
          } else if (action === 'add') {
            await updateDoc(userDoc, {
              points: increment(points)
            });
            alert('Pontos adicionados com sucesso!');
          } else {
            alert('Ação inválida. Use "add" para adicionar pontos ou "deduct" para deduzir.');
          }
        } else {
          alert('Usuário não encontrado.');
        }
      } catch (error) {
        console.error('Erro ao ajustar pontos:', error);
      }
    } else {
      alert('Selecione um usuário e insira a quantidade de pontos.');
    }
  };

const fetchFiles = async () => {
  try {
    const filesRef = collection(db, 'uploadedFiles');
    const filesSnap = await getDocs(filesRef);
    const filesList = filesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Erro ao buscar os arquivos:", error);
  }
};
useEffect(() => {
  fetchFiles();
}, [updateFlag]);
const finalizadoTasks = tasks.filter(task =>
  uploadedFiles.some(file => file.taskId === task.id && file.status === "Finalizado")
);

// Filtra tarefas que não estão "Finalizado"
const activeTasks = tasks.filter(task =>
  !finalizadoTasks.some(finalTask => finalTask.id === task.id)
);

return (
  <div className="flex flex-col items-center p-4 overflow-y-auto pb-10 font-sans text-black h-screen w-screen bg-slate-100 md:bg-gray-900">
    <header className="w-full flex justify-between items-center mb-4">
      <button
        onClick={handleLogout}
        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 ml-auto"
      >
        Logout
      </button>
    </header>

    <main className="w-full max-w-4xl flex flex-col items-center">
      {isAdmin ? (
        <div className="w-full max-w-md p-4 bg-slate-100 rounded-md shadow-md mx-auto h-screen md:h-[100vh]">
          <h2 className="text-xl font-semibold mb-4 text-center">
            Admin Dashboard
          </h2>

          <div className="mb-6">
            <select
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md mb-4"
            >
              <option value="">Selecione um usuário</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-6">
            {selectedUserId ? (
              users
                .filter((user) => user.id === selectedUserId)
                .map((user) => (
                  <p key={user.id} className="text-lg font-semibold">
                    Pontos do Usuário:{" "}
                    <span className="font-bold text-green-500">
                      {user.points ?? 0}
                    </span>
                  </p>
                ))
            ) : (
              <p className="text-gray-500 text-start">
                Selecione um usuário para ver os pontos.
              </p>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Arquivos Enviados</h3>
            <ul className="list-disc">
              {selectedUserId ? (
                tasks
                  .filter((task) =>
                    uploadedFiles.some(
                      (file) =>
                        file.taskId === task.id &&
                        file.userId === selectedUserId
                    )
                  )
                  .map((task) => (
                    <div key={task.id} className="mb-4">
                      <h3 className="font-semibold text-sm text-black">
                        {task.label}
                      </h3>
                      <ul className="list-disc">
                        {uploadedFiles.filter(
                          (file) =>
                            file.taskId === task.id &&
                            file.userId === selectedUserId
                        ).length > 0 ? (
                          uploadedFiles
                            .filter(
                              (file) =>
                                file.taskId === task.id &&
                                file.userId === selectedUserId
                            )
                            .map((file) => (
                              <li key={file.id} className="mb-4 list-none">
                                <div className="flex flex-col items-center justify-between sm:items-start">
                                  <div className="flex items-start w-full">
                                    <p className="font-semibold mr-2 text-sm">
                                      Status:
                                    </p>
                                    <span
                                      className={`font-bold ${
                                        file.status === "Rejeitado"
                                          ? "text-red-500 text-sm"
                                          : file.status === "Aceito"
                                          ? "text-green-500 text-sm"
                                          : "text-orange-500 text-sm"
                                      }`}
                                    >
                                      {file.status}
                                    </span>
                                  </div>

                                  {file.status === "Rejeitado" && (
                                    <div className="flex justify-start items-start w-full">
                                      <span className="font-bold mr-1 text-sm">
                                        Motivo:
                                      </span>
                                      <span className="text-sm">
                                        {file.rejectionReason}
                                      </span>
                                    </div>
                                  )}

                                  <div className="mt-2 sm:mt-0 flex space-x-2 text-xs">
                                    <button
                                      onClick={() => handleDownload(file.id)}
                                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                    >
                                      Baixar
                                    </button>
                                    <button
                                      onClick={() => handleAcceptClick(file.id)}
                                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                    >
                                      Aceitar
                                    </button>
                                    <button
                                      onClick={() => handleRejectClick(file.id)}
                                      className={
                                        file.status === "Finalizado"
                                          ? `px-4 py-2 bg-red-600 text-white cursor-not-allowed pointer-events-none rounded-md hover:bg-red-700`
                                          : `px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700`
                                      }
                                    >
                                      Rejeitar
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleFinalizarClick(file.id)
                                      }
                                      className={`px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700`}
                                    >
                                      Finalizar
                                    </button>
                                  </div>
                                  {rejectingFileId === file.id &&
                                    showRejectInput && (
                                      <div className="mt-4">
                                        <input
                                          type="text"
                                          value={reason}
                                          onChange={(e) =>
                                            setReason(e.target.value)
                                          }
                                          className="w-full p-2 border border-gray-300 rounded-md mb-2"
                                          placeholder="Motivo da rejeição"
                                        />
                                        <button
                                          onClick={() =>
                                            handleSubmitReject(file.id)
                                          }
                                          className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                        >
                                          Confirmar Rejeição
                                        </button>
                                      </div>
                                    )}
                                </div>
                              </li>
                            ))
                        ) : (
                          <>Sem arquivos</>
                        )}
                      </ul>
                    </div>
                  ))
              ) : (
                <p className="text-gray-500 text-start">
                  Selecione um usuário para ver as tarefas.
                </p>
              )}
            </ul>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-xl bg-gray-100 rounded-md shadow-md h-full">
          {!isAdmin && (
            <div className="w-full max-w-xl p-4 bg-gray-950 text-white rounded-md rounded-b-none shadow-md mb-4">
              <h2 className="text-xl font-semibold mb-4">Meus Pontos</h2>
              <p className="text-lg">Você tem {userPoints} pontos.</p>
            </div>
          )}
          <div className="p-4 pb-10">
            <h2 className="text-xl font-semibold mb-4">Upload de Arquivos</h2>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">
                Escolha uma Tarefa e Envie um Arquivo
              </h3>
              <select
                onChange={(e) =>
                  setSelectedTask(
                    tasks.find((task) => task.id === parseInt(e.target.value))
                  )
                }
                className="w-full p-2 border border-gray-300 rounded-md mb-4"
              >
                <option value="">Selecione uma tarefa</option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.label} - {task.points} pontos
                  </option>
                ))}
              </select>
              <input
                type="file"
                onChange={handleFileChange}
                className="w-full mb-4"
              />
              <button
                onClick={handleUpload}
                className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-black"
              >
                Enviar Arquivo
              </button>
              <p className="mt-2">Progresso do Upload: {uploadProgress}%</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2 text-black">
                Meus Arquivos
              </h3>
              {loading ? (
                <div className="flex justify-center items-center h-20">
                  <div className="flex space-x-2">
                    <div className="w-4 h-4 bg-gray-500 rounded-full animate-pulse"></div>
                    <div className="w-4 h-4 bg-gray-500 rounded-full animate-pulse delay-150"></div>
                    <div className="w-4 h-4 bg-gray-500 rounded-full animate-pulse delay-300"></div>
                  </div>
                </div>
              ) : (
                <ul className="list-disc">
                  {tasks
                    .filter((task) =>
                      uploadedFiles.some(
                        (file) =>
                          file.taskId === task.id && file.userId === userId
                      )
                    )
                    .map((task) => (
                      <div key={task.id} className="mb-4">
                        <h3 className="font-semibold text-sm text-black">
                          {task.label}
                        </h3>
                        <ul className="list-disc">
                          {uploadedFiles
                            .filter(
                              (file) =>
                                file.taskId === task.id &&
                                file.userId === userId
                            )
                            .map((file) => (
                              <li key={file.id} className="mb-2 list-none">
                                <div className="flex">
                                  <p className="font-semibold mr-1 text-sm text-slate-600">
                                    Status:
                                  </p>{" "}
                                  <span
                                    className={`font-bold ${
                                      file.status === "Rejeitado"
                                        ? "text-red-500 text-sm"
                                        : file.status === "Aceito"
                                        ? "text-green-500 text-sm"
                                        : "text-orange-500 text-sm"
                                    }`}
                                  >
                                    {file.status}
                                  </span>
                                </div>

                                {file.status === "Rejeitado" && (
                                  <div className="flex">
                                    <span className="font-semibold mr-1 text-sm">
                                      Motivo:
                                    </span>
                                    <span className="text-sm">
                                      {file.rejectionReason}
                                    </span>
                                  </div>
                                )}
                              </li>
                            ))}
                        </ul>
                      </div>
                    ))}
                  {tasks.filter((task) =>
                    uploadedFiles.some(
                      (file) =>
                        file.taskId === task.id && file.userId === userId
                    )
                  ).length === 0 && <>Sem arquivos</>}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  </div>
);

  
  
}