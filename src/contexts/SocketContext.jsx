import React, { createContext, useContext, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'

const SocketContext = createContext(null)

export const useSocket = () => useContext(SocketContext)

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null)

  useEffect(() => {
    // Connect to backend Socket.IO server directly
    const socket = io('http://localhost:5000', {
      transports: ['websocket'],
      withCredentials: true,
    })
    socketRef.current = socket

    // Listen for server connection
    socket.on('server_message', (data) => {
      toast.success(data.data || 'Connected to real-time server')
    })

    // Listen for score updates
    socket.on('score_update', (data) => {
      toast.custom((t) => (
        <div className="bg-white border border-grit-200 rounded-lg shadow-lg px-6 py-4 flex flex-col items-center" style={{ minWidth: 260 }}>
          <div className="text-lg font-bold text-grit-700 mb-1">Credit Score Update</div>
          <div className="text-3xl font-extrabold text-grit-600 mb-2">{data.score}</div>
          <div className={`text-sm font-medium ${data.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>{data.trend === 'up' ? '+' : ''}{data.change} points</div>
        </div>
      ), { duration: 6000 })
    })

    // Listen for dispute updates
    socket.on('dispute_update', (data) => {
      toast('Dispute status updated: ' + (data.status || 'unknown'), {
        icon: '📄',
        duration: 5000,
      })
    })

    // Listen for score simulation events
    socket.on('score_simulation', (data) => {
      toast('Simulated score: ' + data.simulated_score + ' (' + (data.scenario || 'What-if') + ')', {
        icon: '🤖',
        duration: 5000,
      })
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  )
} 