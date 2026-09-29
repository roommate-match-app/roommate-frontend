import { useEffect, useState } from 'react'

function App() {
  const [apiStatus, setApiStatus] = useState<string>('Проверка...')

  useEffect(() => {
    // Запрос к эндпоинту health бэкенда (порт 8000 для FastAPI)
    fetch('http://localhost:8000/health')
      .then(response => {
        if (response.ok) {
          setApiStatus('API: OK')
        } else {
          setApiStatus('API: Ошибка (Неверный статус)')
        }
      })
      .catch(() => {
        setApiStatus('API: Нет связи с сервером')
      })
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>КакДостатьСоседа</h1>
      <p>Статус бэкенда: <strong>{apiStatus}</strong></p>
    </div>
  )
}

export default App