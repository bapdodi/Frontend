import { Client } from "@stomp/stompjs";
import { useEffect, useReducer, useRef, useState } from "react";
import SockJS from "sockjs-client";

import DaySelector from "../components/Create/DaySelector";
import PlaceRecommendations from "../components/Create/PlaceRecommendations";
import TimeTable from "../components/Create/TimeTable";
import Navbar from "../components/Navbar";
import PlanInfo from "../components/NewPlanInfo";

import { useNavigate, useSearchParams } from "react-router-dom";
import { useApiClient } from "../assets/hooks/useApiClient";
import { addMinutes, transformApiResponse } from "../utils/scheduleUtils";

const initialPlanState = {
  planName: "",
  travelName: "",
  travelId: null,
  departure: "",
  transportationCategoryId: 0,
  adultCount: 0,
  childCount: 0,
};

function planReducer(state, action) {
  switch (action.type) {
    case "SET_FIELD":
      return {
        ...state,
        [action.field]: action.value,
      };
    case "SET_ALL":
      return { ...action.payload };
    case "RESET":
      return initialPlanState;
    default:
      return state;
  }
}

function timetableReducer(state, action) {
  switch (action.type) {
    case "create":
      let newState = [...state];

      action.payload.timeTableDtos.forEach((newItem) => {
        const index = newState.findIndex((item) => item.date === newItem.date);
        if (index !== -1) {
          // 날짜가 같고 timeTableId가 다르면 교체
          if (newState[index].timeTableId !== newItem.timeTableId) {
            newState[index] = newItem;
          }
        } else {
          // 날짜가 없으면 추가
          newState.push(newItem);
        }
      });

      // date 기준 오름차순 정렬
      newState.sort((a, b) => new Date(a.date) - new Date(b.date));
      return newState;
    case "update":
      return [...action.payload];
    case "delete":
      const idsToDelete = action.payload.timeTableDtos.map(
        (dto) => dto.timeTableId
      );
      return state.filter((item) => !idsToDelete.includes(item.timeTableId));
    default:
      return state;
  }
}

function App() {
  const BASE_URL = import.meta.env.VITE_API_URL;
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const stompClientRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  const [plan, planDispatch] = useReducer(planReducer, initialPlanState);
  const planRef = useRef(plan);
  const [data, setData] = useState(null);
  const [timetables, timeDispatch] = useReducer(timetableReducer, []);
  const timetablesRef = useRef(timetables);
  const navigate = useNavigate();
  const [noACL, setNoACL] = useState(false)
  
  // State
  const [transformedData, setTransformedData] = useState(null);
  const [schedule, setSchedule] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [places, setPlaces] = useState({
    관광지: [],
    숙소: [],
    식당: [],
    검색: [],
  });

  const { get, post, patch, isAuthenticated } = useApiClient();

  useEffect(() => {
    timetablesRef.current = timetables;
  }, [timetables]);

  const lastMessageRef = useRef(null);
  const clientId = useRef(Date.now() + Math.random());
  const noUpdate = useRef(false);

  function findSameById(data, checkItem) {
    // A 객체의 모든 값들을 배열로 만든 후 검색
    return Object.values(data)
      .flat()
      .find(
        (item) => item.timetablePlaceBlockId === checkItem.timetablePlaceBlockId
      );
  }
  
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const SERVER_URL = `${BASE_URL}/ws-plan?token=${encodeURIComponent(token)}`;

    const connectWebSocket = () => {
      // 실제 연결을 위한 코드 (라이브러리 설치 후 주석 해제)
      const socket = new SockJS(SERVER_URL);
      const client = new Client({
        webSocketFactory: () => socket,
        onConnect: (frame) => {
          setIsConnected(true);
          stompClientRef.current = client;

          // 실제 구독 코드
          client.subscribe(`/topic/${id}/update/plan`, (message) => {
            const received = JSON.parse(message.body);
            // planDto가 유효한 데이터일 때만 업데이트 (null이나 빈 객체 무시)
            if (received.planDto && received.planDto.planId) {
              if (JSON.stringify(planRef.current) !== JSON.stringify(received.planDto)) {
                console.log(`📩 플랜 업데이트 수신: ${message.body}`);
                planDispatch({ type: "SET_ALL", payload: received.planDto });
              }
            }
          });

          client.subscribe(`/topic/${id}/create/timetable`, (message) => {
            console.log("📩 타임테이블 생성 수신:", message.body);
            timeDispatch({ type: "create", payload: JSON.parse(message.body) });
          });

          client.subscribe(`/topic/${id}/update/timetable`, (message) => {
            console.log("📩 타임테이블 업데이트 수신:", message.body);
            const received = JSON.parse(message.body);
            timeDispatch({ type: "update", payload: received.timeTableDtos });
          });

          client.subscribe(`/topic/${id}/delete/timetable`, (message) => {
            console.log("📩 타임테이블 삭제 수신:", message.body);
            timeDispatch({ type: "delete", payload: JSON.parse(message.body) });
          });

          client.subscribe(
            `/topic/${id}/create/timetableplaceblock`,
            (message) => {
              const msg = JSON.parse(message.body);
              if (msg.eventId === clientId.current) return;
              if (
                JSON.stringify(message.body) !==
                JSON.stringify(lastMessageRef.current)
              ) {
                console.log("📩 블록 생성 수신:", message.body);
                const received = JSON.parse(message.body);

                const converted = {
                  timetables: timetablesRef.current,
                  placeBlocks: [received.timeTablePlaceBlockDto],
                };

                const result = transformApiResponse(converted);

                const findId = findSameById(setTransformedData, result);

                if (findId) {
                  return;
                }
                noUpdate.current = true;

                setSchedule((prev) => {
                  const updated = { ...prev };
                  Object.keys(result).forEach((key) => {
                    const existingItems = prev[key] || [];

                    // 새 항목들을 timetablePlaceBlockId로 맵 만들기
                    const newItemsMap = new Map(
                      result[key].map((item) => [item.url, item])
                    );

                    // 기존 아이템을 순회하며, 새 아이템으로 덮어쓰거나 유지
                    const mergedItems = existingItems.map((item) =>
                      newItemsMap.has(item.url)
                        ? newItemsMap.get(item.url)
                        : item
                    );

                    // 새 아이템 중 기존에 없는 항목만 추가
                    const existingIds = new Set(
                      existingItems.map((item) => item.url)
                    );
                    const newItemsToAdd = result[key].filter(
                      (item) => !existingIds.has(item.url)
                    );

                    updated[key] = [...mergedItems, ...newItemsToAdd];
                  });
                  return updated;
                });
              }
              lastMessageRef.current = message.body;
            }
          );

          client.subscribe(
            `/topic/${id}/update/timetableplaceblock`,
            (message) => {
              const msg = JSON.parse(message.body);
              if (msg.eventId === clientId.current) return;
              if (
                JSON.stringify(message.body) !==
                JSON.stringify(lastMessageRef.current)
              ) {
                console.log("📩 블록 업데이트 수신:", message.body);
                const received = JSON.parse(message.body);

                const converted = {
                  timetables: timetablesRef.current,
                  placeBlocks: [received.timeTablePlaceBlockDto],
                };
                const result = transformApiResponse(converted);

                setSchedule((prev) => {
                  const updated = { ...prev };
                  Object.keys(result).forEach((key) => {
                    const existingItems = prev[key] || [];

                    // 새 항목들을 timetablePlaceBlockId로 맵 만들기
                    const newItemsMap = new Map(
                      result[key].map((item) => [
                        item.timetablePlaceBlockId,
                        item,
                      ])
                    );

                    // 기존 아이템을 순회하며, 새 아이템으로 덮어쓰거나 유지
                    const mergedItems = existingItems.map((item) =>
                      newItemsMap.has(item.timetablePlaceBlockId)
                        ? newItemsMap.get(item.timetablePlaceBlockId)
                        : item
                    );

                    // 새 아이템 중 기존에 없는 항목만 추가
                    const existingIds = new Set(
                      existingItems.map((item) => item.timetablePlaceBlockId)
                    );
                    const newItemsToAdd = result[key].filter(
                      (item) => !existingIds.has(item.timetablePlaceBlockId)
                    );

                    updated[key] = [...mergedItems, ...newItemsToAdd];
                  });
                  return updated;
                });
              }

              lastMessageRef.current = message.body;
            }
          );

          client.subscribe(
            `/topic/${id}/delete/timetableplaceblock`,
            (message) => {
              const msg = JSON.parse(message.body);
              if (msg.eventId === clientId.current) return;
              if (
                JSON.stringify(message.body) !==
                JSON.stringify(lastMessageRef.current)
              ) {
                console.log("📩 블록 삭제 수신:", message.body);
                const received = JSON.parse(message.body).timeTablePlaceBlockDto
                  .blockId;

                setSchedule((prevSchedule) => {
                  // 모든 timetableId 키에 대해 순회하며 필터링
                  const newSchedule = {};

                  Object.entries(prevSchedule).forEach(
                    ([timetableId, blocks]) => {
                      newSchedule[timetableId] = blocks.filter(
                        (block) => block.timetablePlaceBlockId !== received
                      );
                    }
                  );

                  return newSchedule;
                });
              }
              lastMessageRef.current = message.body;
            }
          );
        },
        onStompError: (frame) => {
          console.error("❌ STOMP 에러:", frame.headers["message"]);
          setIsConnected(false);
          client.deactivate();
        },
        onWebSocketClose: () => {
          setIsConnected(false);
          client.deactivate();
        },
      });

      client.activate();
    };

    connectWebSocket();

    // 정리 함수
    return () => {
      if (stompClientRef.current) {
        setIsConnected(false);
        stompClientRef.current.deactivate();
      }
    };
  }, []);

  const firstSchedule = useRef(false);

  // 초기 데이터 로딩
  useEffect(() => {
    const fetchPlanData = async () => {
      if (id && isAuthenticated()) {
        try {
          console.log("=== getPlan 호출 시작 ===");
          console.log("요청 URL:", `${BASE_URL}/api/plan/${id}`);
          
          const planData = await get(`${BASE_URL}/api/plan/${id}`);
          
          console.log("=== getPlan 응답 데이터 ===");
          console.log("전체 응답:", planData);
          console.log("planFrame:", planData.planFrame);
          console.log("timetables:", planData.timetables);
          console.log("placeBlocks:", planData.placeBlocks);
          console.log("timetables 개수:", planData.timetables?.length || 0);
          console.log("placeBlocks 개수:", planData.placeBlocks?.length || 0);
          console.log("userDayIndexes:", planData.userDayIndexes);
          
          const planFrame = planData.planFrame;

          setData(planData);

          planDispatch({ type: "SET_ALL", payload: planFrame });

          if (planData.timetables) {
            timeDispatch({ type: "update", payload: planData.timetables });
            if (planData.timetables.length > 0) {
              setSelectedDay(planData.timetables[0].timeTableId);
            }
          }

          const result = transformApiResponse(planData);
          setTransformedData(result);

          firstSchedule.current = true;
        } catch (err) {
          const errorMessage = err.response?.data?.message || err.message;
          console.error("일정 정보를 가져오는데 실패했습니다:", err);
          if (errorMessage.includes("요청 권한이 없습니다")) {
            setNoACL(true);
          }
        }
      } else {
        alert("로그인 후 접근해주세요.");
        navigate("/");
      }
    };

    fetchPlanData();
  }, []);

  // 추천 장소 데이터 로딩
  useEffect(() => {
    const fetchPlaces = async () => {
      if (id && isAuthenticated()) {
        try {
          const [tour, lodging, restaurant] = await Promise.all([
            post(`${BASE_URL}/api/plan/${id}/tour`),
            post(`${BASE_URL}/api/plan/${id}/lodging`),
            post(`${BASE_URL}/api/plan/${id}/restaurant`),
          ]);

          // xlocation/ylocation을 xLocation/yLocation으로 변환
          const normalizeCoordinates = (places) => {
            return places?.map(place => ({
              ...place,
              xLocation: place.xLocation ?? place.xlocation,
              yLocation: place.yLocation ?? place.ylocation,
            })) || [];
          };

          setPlaces({
            관광지: normalizeCoordinates(tour.places),
            숙소: normalizeCoordinates(lodging.places),
            식당: normalizeCoordinates(restaurant.places),
          });
        } catch (err) {
          console.error("추천 장소를 가져오는데 실패했습니다:", err);
        }
      }
    };

    fetchPlaces();
  }, [id, plan.travelId]);

  useEffect(() => {
    planRef.current = plan;
  }, [plan]);

  // 스케줄 초기화
  useEffect(() => {
    if (firstSchedule.current) {
      if (transformedData) {
        setSchedule(transformedData);
        firstSchedule.current = false;
      } else if (timetables.length > 0) {
        const initialSchedule = {};
        timetables.forEach((timetable) => {
          initialSchedule[timetable.timeTableId] = [];
        });
        setSchedule(initialSchedule);
        firstSchedule.current = false;
      }
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
          placeCategory: place.categoryId,
          placeName: place.name,
          placeAddress: place.formatted_address,
          placeRating: place.rating,
          startTime: `${startTime}:00`,
          endTime: `${endTime}:00`,
          date: date,
          xLocation: place.xLocation,
          yLocation: place.yLocation,
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
        await patch(`${BASE_URL}/api/plan/${id}/save`, {
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
    const matched = timetables.find((t) => t.timeTableId === id);
    return matched?.date ?? null;
  };

  useEffect(() => {
    // plan이 유효한 데이터가 있고, planId가 있을 때만 전송 (초기 로딩 시 빈 데이터 전송 방지)
    if (plan && plan.planId) {
      const client = stompClientRef.current;
      if (client && client.connected) {
        const planData = {
          planDto: plan
        };
        client.publish({
          destination: `/app/${id}/update/plan`,
          body: JSON.stringify(planData),
        });
        console.log("🚀 플랜 업데이트 전송:", planData);
      }
    }
  }, [plan]);

  const prevScheduleRef = useRef({});

  useEffect(() => {
    const timer = setTimeout(() => {
      const prevSchedule = prevScheduleRef.current;
      const newSchedule = schedule;

      const allKeys = new Set([
        ...Object.keys(prevSchedule),
        ...Object.keys(newSchedule),
      ]);

      allKeys.forEach((key) => {
        const prevArr = prevSchedule[key] || [];
        const newArr = newSchedule[key] || [];

        const added = newArr.filter(
          (newItem) =>
            !prevArr.some((prevItem) => prevItem.placeId === newItem.placeId)
        );

        const removed = prevArr.filter(
          (prevItem) =>
            !newArr.some((newItem) => newItem.placeId === prevItem.placeId)
        );

        const changed = newArr.filter((newItem) => {
          const prevItem = prevArr.find(
            (prevItem) => prevItem.placeId === newItem.placeId
          );
          return (
            prevItem && JSON.stringify(prevItem) !== JSON.stringify(newItem)
          );
        });

        if (added.length > 0) {
          const item = added[0];
          if (!item.timetablePlaceBlockId) {
            const date = getDateById(Number(key));
            const endTime = addMinutes(item.timeSlot, item.duration * 15);

            const initialCreate = {
              timeTablePlaceBlockDto: {
                timeTableId: Number(key),
                blockId: null,
                placeCategoryId: item.categoryId,
                placeName: item.name,
                placeTheme: "테스트",
                placeRating: item.rating,
                placeAddress: item.formatted_address,
                placeLink: item.url,
                placeId: item.placeId,
                date: date,
                blockStartTime: `${item.timeSlot}:00`,
                blockEndTime: `${endTime}:00`,
                xLocation: item.xLocation || item.geometry?.location?.lng || 0,
                yLocation: item.yLocation || item.geometry?.location?.lat || 0,
              },
            };

            const client = stompClientRef.current;
            if (client && client.connected) {
              client.publish({
                destination: `/app/${id}/create/timetableplaceblock`,
                body: JSON.stringify({
                  eventId: clientId.current,
                  ...initialCreate,
                }),
              });
              console.log("🚀 블록 생성 전송:", initialCreate);
            }
          }
        }
        if (removed.length > 0) {
          const item = removed[0];

          const initialDelete = {
            timeTablePlaceBlockDto: {
              blockId: item.timetablePlaceBlockId,
              timeTableId: Number(key),
            },
          };

          const client = stompClientRef.current;
          if (client && client.connected) {
            client.publish({
              destination: `/app/${id}/delete/timetableplaceblock`,
              body: JSON.stringify({
                eventId: clientId.current,
                ...initialDelete,
              }),
            });
            console.log("🚀 블록 삭제 전송:", initialDelete);
          }
        }
        if (changed.length > 0) {
          if (!noUpdate.current) {
            const item = changed[0];
            const date = getDateById(Number(key));
            const endTime = addMinutes(item.timeSlot, item.duration * 15);

            const initialUpdate = {
              timeTablePlaceBlockDto: {
                timeTableId: Number(key),
                blockId: item.timetablePlaceBlockId,
                placeCategory: item.categoryId,
                placeName: item.name,
                placeTheme: "테스트",
                placeRating: item.rating,
                placeAddress: item.formatted_address,
                placeLink: item.url,
                date: date,
                blockStartTime: `${item.timeSlot}:00`,
                blockEndTime: `${endTime}:00`,
                xLocation: item.xLocation || item.geometry?.location?.lng || 0,
                yLocation: item.yLocation || item.geometry?.location?.lat || 0,
              },
            };

            const client = stompClientRef.current;
            if (client && client.connected) {
              console.log("🚀 블록 업데이트 전송:", initialUpdate);
              client.publish({
                destination: `/app/${id}/update/timetableplaceblock`,
                body: JSON.stringify({
                  eventId: clientId.current,
                  ...initialUpdate,
                }),
              });
            }
          } else {
            noUpdate.current = false;
          }
        }
      });

      // 깊은 복사로 이전 스케줄 저장
      prevScheduleRef.current = JSON.parse(JSON.stringify(newSchedule));
    }, 50); // 0.05초 지연 후 발사

    return () => clearTimeout(timer);
  }, [schedule]);

  useEffect(() => {
    const filteredSchedule = {};

    for (const dayKey in schedule) {
      const arr = schedule[dayKey];
      const uniqueArr = Array.from(
        new Map(arr.map((item) => [item.placeId, item])).values()
      );
      filteredSchedule[dayKey] = uniqueArr;
    }

    if (JSON.stringify(filteredSchedule) !== JSON.stringify(schedule)) {
      setSchedule(filteredSchedule);
    }
  }, [schedule]);

  const requestEdit = async () => {
    try {
      await post(`${BASE_URL}/api/plan/${id}/request-access`)
      alert("편집 권한을 요청했습니다.");
    } catch (err) {
      console.error("요청에 실패했습니다.", err);
    }
  };

  // 로딩 상태
  if (!selectedDay || !timetables.length) {
    return (
      <div className="min-h-screen font-pretendard">
        <Navbar />
        {data && <PlanInfo info={data.planFrame} id={id} />}
        {noACL ? 
          <div className="w-[1400px] h-[calc(100vh-125px)] mx-auto py-6 space-y-3 flex items-center justify-center flex-col">
            <div className="text-3xl"><span className="text-main font-bold">편집 권한</span>이 없습니다.</div>
            <div className="space-x-3">
              <button onClick={() => navigate("/mypage")} className="font-semibold border border-gray-500 text-gray-700 hover:bg-gray-200 py-2 px-4 rounded-lg">
                마이페이지로 가기
              </button>
              <button onClick={requestEdit} className="font-semibold text-white bg-main py-2 px-4 rounded-lg">
                편집 권한 요청하기
              </button>
            </div>
          </div>
        :
          <div className="w-[1400px] mx-auto py-6 flex items-center justify-center">
            <div>일정 정보를 불러오는 중...</div>
          </div>
        }
      </div>
    );
  }


  return (
    <div className="min-h-screen font-pretendard">
      <Navbar />
      {plan && (
        <PlanInfo
          info={plan}
          planDispatch={planDispatch}
          id={id}
          savePlan={savePlan}
          schedule={schedule}
          selectedDay={selectedDay}
        />
      )}

      <div className="w-[1400px] mx-auto py-6">
        <div className="flex space-x-6 flex-1">
          <DaySelector
            timetables={timetables}
            timeDispatch={timeDispatch}
            selectedDay={selectedDay}
            onDaySelect={setSelectedDay}
            stompClientRef={stompClientRef}
            id={id}
            schedule={schedule}
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
            schedule={schedule}
            onPlacesUpdate={updatePlaces}
          />
        </div>
        {/* <button className="hover:bg-gray-300" onClick={() => balsa()}>테스트 버튼</button> */}
      </div>
    </div>
  );
}

export default App;
