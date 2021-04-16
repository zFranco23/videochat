import React,{createContext,useState,useRef,useEffect} from 'react';
import {io} from 'socket.io-client';
import Peer from 'simple-peer';


const SocketContext=createContext();

//Instancia inicial del socket.io

const socket =io("https://back-video-chat.herokuapp.com")//Dentro va el server

const ContextProvider = ({children})=>{

    const [stream,setStream]=useState(null);
    const [me,setMe]=useState("");
    const [call,setCall]=useState({})
    const [callAccepted,setCallAccepted]=useState(false);
    const [callEnded,setCallEnded]=useState(false);
    const [name,setName]=useState("");

    const myVideo = useRef();
    const userVideo=useRef();
    const connectionRef=useRef();


    useEffect(()=>{
        //Al inicio debemos pedir permiso para usar el video y el audio.
        navigator.mediaDevices.getUserMedia({
            video :true, audio :true
        }).then((currentStream)=>{
            setStream(currentStream);

            myVideo.current.srcObject= currentStream;
        })
        //Escuchar una acción
        socket.on('me',(id)=>setMe(id));

        socket.on('calluser',({ from, name:callerName, signal })=>{
            setCall({ isReceivedCall:true, from, name:callerName, signal })
        })
    },[])

    const answerCall = ()=>{
        setCallAccepted(true);

        //Crear un peer capaz de aceptar el video , con unas configuracioens
        const peer = new Peer({
            initiator:false,//Porque no se inicia una llamada , solo es una respuesta
            trickle:false,
            stream
        })
        //Una vez recibamos la señal
        //Entrelazar con el socket con nuestros peers para finalmente establecer la video conexion
        peer.on('signal',(data)=>{
            socket.emit('answercall',{ signal:data, to:call.from }) //Enviar la data y quien esta llamando.
        })

        peer.on('stream',(currentStream)=>{
            userVideo.current.srcObject=currentStream; //Stream de la otra persona
        })

        peer.signal(call.signal);
        connectionRef.current=peer;
    }

    const callUser = (id)=>{
        const peer = new Peer({
            initiator:true,
            trickle:false,
            stream
        })

        peer.on('signal',(data)=>{
            socket.emit('calluser',{ userToCall:id, signalData: data , from :me , name}) //Enviar la data y quien esta llamando.
        })

        peer.on('stream',(currentStream)=>{
            userVideo.current.srcObject=currentStream; //Stream de la otra persona
        })

        socket.on("callaccepted",(signal)=>{
            setCallAccepted(true);

            peer.signal(signal);
        })
        connectionRef.current=peer;
    }

    const leaveCall = ()=>{
        setCallEnded(true);
        connectionRef.current.destroy();

        //Recargar la pagina y dar un nuevo id
        window.location.reload();
    }

    return (
        <SocketContext.Provider value={{
            call,
            callAccepted,
            myVideo,
            userVideo,
            stream,
            name,
            setName,
            callEnded,
            me,
            callUser,
            leaveCall,
            answerCall
        }}>
            {children}
        </SocketContext.Provider>
    )
}

export {ContextProvider, SocketContext};