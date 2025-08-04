import { useState, useEffect, useReducer, useRef } from "react";
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

import Navbar from "../components/navbar";
import PlanInfo from "../components/NewPlanInfo";
import DaySelector from "../components/Create/DaySelector";
import TimeTable from "../components/Create/TimeTable";
import PlaceRecommendations from "../components/Create/PlaceRecommendations";

import { useSearchParams } from "react-router-dom";
import { useApiClient } from "../assets/hooks/useApiClient";
import { transformApiResponse, addMinutes } from "../utils/scheduleUtils";

const initialPlanState = {
  planName: '',
  travelId: 0,
  departure: '',
  transportationCategoryId: 0,
  adultCount: 0,
  childCount: 0,
  travel: ''
};

function planReducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':
      return {
        ...state,
        [action.field]: action.value,
      };
    case 'SET_ALL':
      return { ...action.payload };
      case 'RESET':
        return initialPlanState;
        default:
          return state;
        }
      }
      
function App() {
  let stompClient = null;
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const stompClientRef = useRef(null);

  useEffect(() => {
    const socket = new SockJS("http://192.168.219.108:8080/ws-plan");
    stompClient = new Client({
      webSocketFactory: () => socket,
      onConnect: (frame) => {
        console.log("✅ WebSocket 연결 완료:", frame);
        stompClientRef.current = stompClient;

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

  const [plan, planDispatch] = useReducer(planReducer, initialPlanState);

  const { get, post, patch, isAuthenticated } = useApiClient();
  
  // State
  const [data, setData] = useState(null);
  const [timetables, setTimetables] = useState([]);
  const [transformedData, setTransformedData] = useState(null);
  const [schedule, setSchedule] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [places, setPlaces] = useState({
    관광지: [],
    숙소: [],
    식당: [],
  });

  // 초기 데이터 로딩
  useEffect(() => {
    const fetchPlanData = async () => {
      if (id && isAuthenticated()) {
        try {
          const planData = await get(`/api/plan/${id}`);
          const planFrame = planData.planFrame
          
          setData(planData);
          
          // plan 정보 등록 (* /api/plan/${id}와 웹소켓으로 보내야 하는거랑 묘하게 달라서 이렇게 씀)
          planDispatch({ type: 'SET_FIELD', field: "planName", value: planFrame.planName });
          planDispatch({ type: 'SET_FIELD', field: "travelId", value: planFrame.travelId });
          planDispatch({ type: 'SET_FIELD', field: "travel", value: planFrame.travel });
          planDispatch({ type: 'SET_FIELD', field: "departure", value: planFrame.departure });
          planDispatch({ type: 'SET_FIELD', field: "transportationCategoryId", value: planFrame.transportation });
          planDispatch({ type: 'SET_FIELD', field: "adultCount", value: planFrame.adultCount });
          planDispatch({ type: 'SET_FIELD', field: "childCount", value: planFrame.childCount });
          
          if (planData.timetables) {
            setTimetables(planData.timetables);
            if (planData.timetables.length > 0) {
              setSelectedDay(planData.timetables[0].timetableId);
            }
          }

          const result = transformApiResponse(planData);
          setTransformedData(result);
        } catch (err) {
          console.error("일정 정보를 가져오는데 실패했습니다:", err);
        }
      }
    };

    fetchPlanData();
  }, [id]);

  // 추천 장소 데이터 로딩
  useEffect(() => {
    const fetchPlaces = async () => {
      if (id && isAuthenticated()) {
        try {
          const [tour, lodging, restaurant] = await Promise.all([
            post(`/api/plan/${id}/tour`),
            post(`/api/plan/${id}/lodging`),
            post(`/api/plan/${id}/restaurant`)
          ]);

          setPlaces({
            관광지: tour.places,
            숙소: lodging.places,
            식당: restaurant.places,
          });
        } catch (err) {
          console.error("추천 장소를 가져오는데 실패했습니다:", err);
        }
      }
    };

    fetchPlaces();
  }, [id]);

  useEffect(() => {
    console.log(plan)
  }, [plan])

  // 스케줄 초기화
  useEffect(() => {
    if (transformedData) {
      setSchedule(transformedData);
    } else if (timetables.length > 0) {
      const initialSchedule = {};
      timetables.forEach((timetable) => {
        initialSchedule[timetable.timetableId] = [];
      });
      setSchedule(initialSchedule);
    }
  }, [timetables, transformedData]);

  // 스케줄 업데이트 함수
  const updateSchedule = (newSchedule) => {
    setSchedule(newSchedule);
  };

  // 장소 업데이트 함수
  const updatePlaces = (newPlaces) => {
    setPlaces(newPlaces);
  };

  // 날짜별 일정 내보내기
  const exportSchedule = () => {
    const grouped = {};

    Object.entries(schedule).forEach(([timetableIdStr, day]) => {
      if (!Array.isArray(day) || day.length === 0) return;

      const timetableId = parseInt(timetableIdStr, 10);
      const date = getDateById(timetableId);

      for (const place of day) {
        const startTime = place.timeSlot;
        const endTime = addMinutes(startTime, place.duration * 15);
        
        const block = {
          placeCategoryId: place.categoryId,
          placeName: place.name,
          placeAddress: place.formatted_address,
          placeRating: place.rating,
          startTime: `${startTime}:00`,
          endTime: `${endTime}:00`,
          date: date,
          xLocation: place.xlocation,
          yLocation: place.ylocation,
          placeLink: place.url,
          placeTheme: "역사",
        };

        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(block);
      }
    });

    return Object.values(grouped);
  };

  // 일정 저장
  const savePlan = async (info) => {
    const scheduleToExport = exportSchedule();
    
    if (isAuthenticated()) {
      try {
        await patch(`/api/plan/${id}/save`, {
          departure: data.planFrame.departure,
          travel: data.planFrame.travel,
          transportationCategoryId: info.transportation,
          adultCount: info.adultCount,
          childCount: info.childCount,
          timetables: data.timetables,
          timetablePlaceBlocks: scheduleToExport,
        });
      } catch (err) {
        console.error("저장에 실패해버렸습니다:", err);
      }
    }
  };

  const getDateById = (id) => {
    const matched = data.timetables.find((t) => t.timetableId === id);
    return matched?.date ?? null;
  };
  
  useEffect(() => {
    const client = stompClientRef.current;
    if (client && client.connected) {
      const planData = plan;
      client.publish({
        destination: `/app/plan/${id}/update/plan`,
        body: JSON.stringify(planData),
      });
      console.log("🚀 메시지 전송:", planData);
    }
  }, [plan])

  // 로딩 상태
  if (!selectedDay || !timetables.length) {
    return (
      <div className="min-h-screen font-pretendard">
        <Navbar />
        {data && <PlanInfo info={data.planFrame} id={id} />}
        <div className="w-[1400px] mx-auto py-6 flex items-center justify-center">
          <div>일정 정보를 불러오는 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-pretendard">
      <Navbar />
      {data && <PlanInfo info={plan} planDispatch={planDispatch} id={id} savePlan={savePlan} />}
      
      <div className="w-[1400px] mx-auto py-6">
        <div className="flex space-x-6 flex-1">
          <DaySelector
            timetables={timetables}
            selectedDay={selectedDay}
            onDaySelect={setSelectedDay}
          />
          
          <TimeTable
            selectedDay={selectedDay}
            timetables={timetables}
            schedule={schedule}
            places={places}
            onScheduleUpdate={updateSchedule}
            onPlacesUpdate={updatePlaces}
          />
          
          <PlaceRecommendations
            places={places}
            onPlacesUpdate={updatePlaces}
          />
        </div>
      </div>
    </div>
  );
};

export default App;