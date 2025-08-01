import React, { useEffect } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const WebSocketTest = () => {
  let stompClient = null;
  const id = searchParams.get("id");
  useEffect(() => {
    const socket = new SockJS("http://192.168.219.134:8080/ws-plan");
    stompClient = new Client({
      webSocketFactory: () => socket,
      onConnect: (frame) => {
        console.log("✅ WebSocket 연결 완료:", frame);

        stompClient.subscribe(`/topic/plan/${id}/update/plan`, (message) => {
          console.log("📩 수신된 메시지:", message.body);
          alert("수신된 메시지: " + message.body);
        });

        stompClient.subscribe(`/topic/plan/${id}/create/timetable`, (message) => {
          console.log("📩 수신된 메시지:", message.body);
          alert("수신된 메시지: " + message.body);
        });

        stompClient.subscribe(`/topic/plan/${id}/update/timetable`, (message) => {
          console.log("📩 수신된 메시지:", message.body);
          alert("수신된 메시지: " + message.body);
        });

        stompClient.subscribe(`/topic/plan/${id}/delete/timetable`, (message) => {
          console.log("📩 수신된 메시지:", message.body);
          alert("수신된 메시지: " + message.body);
        });

        stompClient.subscribe(`/topic/plan/${id}/create/timetableplaceblock`, (message) => {
          console.log("📩 수신된 메시지:", message.body);
          alert("수신된 메시지: " + message.body);
        });

        stompClient.subscribe(`/topic/plan/${id}/update/timetableplaceblock`, (message) => {
          console.log("📩 수신된 메시지:", message.body);
          alert("수신된 메시지: " + message.body);
        });

        stompClient.subscribe(`/topic/plan/${id}/delete/timetableplaceblock`, (message) => {
          console.log("📩 수신된 메시지:", message.body);
          alert("수신된 메시지: " + message.body);
        });
      },
    });

    stompClient.activate();

    return () => {
      stompClient.deactivate();
    };
  }, []);

  const updatePlan = () => {
    const planData = { planName: "new plan" };
    stompClient.publish({
      destination: "/app/plan/2/update/plan",
      body: JSON.stringify(planData),
    });
    console.log("🚀 메시지 전송:", planData);
  };

  const createPlan
   = () => {
    const timeTableData = {
      timetableVO: {
        date: "2023-10-01",
        startTime: "10:00:00",
        endTime: "22:00:00",
      },
    };
    stompClient.publish({
      destination: `/app/plan/${id}/create/timetable`,
      body: JSON.stringify(timeTableData),
    });
    console.log("🚀 시간표 생성 메시지 전송:", timeTableData);
  };

  const timeTableBlockCreate = () => {
    const timeTableBlockData = {
      timeTableId: 1,
      blockName: "new block",
    };
    stompClient.publish({
      destination: `/app/plan/${id}/create/timetableBlock`,
      body: JSON.stringify(timeTableBlockData),
    });
    console.log("🚀 시간표 블록 생성 메시지 전송:", timeTableBlockData);
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">📡 실시간 플랜 테스트</h2>
      <button onClick={sendUpdate} className="bg-blue-500 text-white px-4 py-2 rounded mr-2">플랜 업데이트</button>
      <button onClick={timeTableCreate} className="bg-green-500 text-white px-4 py-2 rounded mr-2">시간표 생성</button>
      <button onClick={timeTableBlockCreate} className="bg-purple-500 text-white px-4 py-2 rounded">시간표 블록 생성</button>
    </div>
  );
};

export default WebSocketTest;
