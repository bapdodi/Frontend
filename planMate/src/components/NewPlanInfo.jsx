// useReducer로 바꾸기 위한 컴포넌트입니다.

import { useEffect, useRef, useState } from "react";
import { Map, MapMarker, Polyline } from "react-kakao-maps-sdk";
import { useNavigate } from 'react-router-dom';
import { useApiClient } from "../assets/hooks/useApiClient";
import useKakaoLoader from "../hooks/useKakaoLoader";
import DepartureModal from "./Departure";
import LocationModal from "./HomeDestination";
import PersonCountModal from "./HomePerson";
import ShareModal from "./ShareModal";
import TransportModal from "./TransportModal";


export default function PlanInfo({info, id, planDispatch, schedule, selectedDay, activeUsers = []}) {
  const { patch, isAuthenticated } = useApiClient();
  const navigate = useNavigate();
  const flexCenter = "flex items-center";
  
  const [sendCreate, setSendCreate] = useState({});

  const transInfo = {"bus": "대중교통", "car": "자동차"};
  const transInfo2 = {0: "bus", 1: "car"};
  const transInfo3 = {"bus": 0, "car": 1};

  const [isDepartureOpen, setIsDepartureOpen] = useState(false);
  //const [departureLocation, setDepartureLocation] = useState(info.departure);

  //const [destinationLocation, setDestinationLocation] = useState(info.travel);
  const [isDestinationOpen, setIsDestinationOpen] = useState(false);

  const [isTransportOpen, setIsTransportOpen] = useState(false); 
  const [selectedTransport, setSelectedTransport] = useState(transInfo2[info.transportationCategoryId]);

  const [isPersonCountOpen, setIsPersonCountOpen] = useState(false);
  const [personCount, setPersonCount] = useState({ adults: info.adultCount, children: info.childCount });

  const [title, setTitle] = useState(info.planName);

  const [mapModalOpen, setMapModalOpen] = useState(false);

  const [sortedState, setSortedState] = useState({});

  const [isShareOpen, setIsShareOpen] = useState(false);

  const spanRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (spanRef.current && inputRef.current) {
      const spanWidth = spanRef.current.offsetWidth;
      inputRef.current.style.width = `${spanWidth + 2}px`;
    }
  }, [title]);

  useEffect(() => {
    if (!schedule) return; // schedule이 undefined/null이면 early return
    
    const sade = Object.fromEntries(
      Object.entries(schedule).map(([key, places]) => [
        key,
        [...places].sort((a, b) => {
          // "HH:MM" 형식을 Date 비교로 변환
          const timeA = a.timeSlot.split(":").map(Number);
          const timeB = b.timeSlot.split(":").map(Number);
          return timeA[0] - timeB[0] || timeA[1] - timeB[1];
        })
      ])
    );

    setSortedState(sade);
  }, [schedule])

  /*useEffect(() => {
    const patchApi = async () => {
      if (isAuthenticated()) {
        try {
          await patch(`/api/plan/${id}/name`, {
            planName: title
          });
        } catch (err) {
          console.error("패치에 실패해버렸습니다:", err);
        }
      }
    };
    patchApi();
  }, [title]);*/

  const handleTransportOpen = () => {
    setIsTransportOpen(true);
  };

  const handleTransportClose = () => {
    setIsTransportOpen(false);
  };

  const handleTransportChange = (transport) => {
    setSelectedTransport(transport);
    planDispatch({ type: 'SET_FIELD', field: "transportationCategoryId", value: transInfo3[transport] });
  };

  const handlePersonCountOpen = () => {
    setIsPersonCountOpen(true);
  };

  const handlePersonCountClose = () => {
    setIsPersonCountOpen(false);
  };

  const handlePersonCountChange = (count) => {
    planDispatch({ type: 'SET_FIELD', field: "adultCount", value: count.adults });
    planDispatch({ type: 'SET_FIELD', field: "childCount", value: count.children });
  };

  const handleDepartureOpen = () => {
    setIsDepartureOpen(true);
  };

  const handleDepartureClose = () => {
    setIsDepartureOpen(false);
  };

  const handleDepartureLocationSelect = (location) => {
    planDispatch({ type: 'SET_FIELD', field: "departure", value: location.name });
  };

  const handleDestinationLocationSelect = (location) => {
    planDispatch({ type: 'SET_FIELD', field: "travelId", value: location.id });
    planDispatch({ type: 'SET_FIELD', field: "travelName", value: location.name.split(" ").pop() });
  };

  const handleDestinationOpen = () => {
    setIsDestinationOpen(true);
  };

  const handleDestinationClose = () => {
    setIsDestinationOpen(false);
  };

  useEffect(() => {
    setSelectedTransport(transInfo2[info.transportationCategoryId]);
    setTitle(info.planName);
  }, [info]);

  /*useEffect(() => {
    setSendCreate({"transportation": transInfo3[selectedTransport], "adultCount": personCount["adults"], "childCount": personCount["children"]});
  }, [selectedTransport, personCount])*/

  return (
    <div className={`mx-auto w-[1416px] pt-6 ${flexCenter} justify-between`}>
      <div className={`${flexCenter} space-x-6`}>
        <div>
          <input 
            ref={inputRef}
            type="text"
            className="rounded-lg py-1 px-2 hover:bg-gray-100 mr-3 text-lg font-semibold"
            onChange={(e) => {
              setTitle(e.target.value)
            }}
            onBlur={() => {
              planDispatch({ type: 'SET_FIELD', field: 'planName', value: title });
            }}
            style={{ minWidth: '1ch', maxWidth: "220px" }}
            value={title}
          />
        </div>
        <button className="rounded-lg py-1 px-2 hover:bg-gray-100" onClick={handlePersonCountOpen}>
          <div className={`${flexCenter}`}>
            <p className="text-gray-500 mr-3">인원 수</p>

            <p className="px-2 py-1 bg-gray-200 text-gray-700 rounded-md text-sm mr-2">성인</p>
            <p className="text-lg mr-4">{info.adultCount}명</p>

            <p className="px-2 py-1 bg-gray-200 text-gray-700 rounded-md text-sm mr-2">어린이</p>
            <p className="text-lg">{info.childCount}명</p>
          </div>
        </button>
        <button className="rounded-lg py-1 px-2 hover:bg-gray-100" onClick={handleDepartureOpen}>
          <div className={`${flexCenter}`}>
            <p className="text-gray-500 mr-3">출발지</p>
            <p className="text-lg truncate max-w-56">{info.departure}</p>
          </div>
        </button>
        <button className="rounded-lg py-1 px-2 hover:bg-gray-100" onClick={handleDestinationOpen}>
          <div className={`${flexCenter}`}>
            <p className="text-gray-500 mr-3">여행지</p>
            <p className="text-lg">{info.travelName}</p>
          </div>
        </button>
        <button className="rounded-lg py-1 px-2 hover:bg-gray-100" onClick={handleTransportOpen}>
          <div className={flexCenter}>
            <p className="text-gray-500 mr-3">이동수단</p>
            <p className="text-lg">{transInfo[selectedTransport]}</p>
          </div>
        </button>
      </div>

      <div className={`${flexCenter} ml-auto mr-8 -space-x-3`}>
        {activeUsers.map((user, idx) => (
          <div
            key={`${user.uid}-${idx}`}
            title={user.userNickname}
            className="w-9 h-9 rounded-full border-2 border-white bg-main text-white flex items-center justify-center text-sm font-bold shadow-sm cursor-help hover:z-10 transition-all"
            style={{ backgroundColor: `hsl(${(parseInt(user.uid) * 137) || (idx * 45) % 360}, 60%, 45%)` }}
          >
            {user.userNickname?.charAt(0) || '?'}
          </div>
        ))}
      </div>

      <div className={`${flexCenter} mr-2`}>
        <button onClick={() => setMapModalOpen(true)} className="px-4 py-2 rounded-lg bg-gray-300 mr-3 hover:bg-gray-400">
          지도로 보기
        </button>
        <button onClick={() => setIsShareOpen(true)} className="px-4 py-2 rounded-lg bg-gray-300 mr-3 hover:bg-gray-400">
          공유
        </button>
        <button onClick={() => navigate(`/complete?id=${id}`)} className="px-4 py-2 rounded-lg bg-main text-white">
          완료
        </button>
      </div>

      <DepartureModal
        isOpen={isDepartureOpen}
        onClose={handleDepartureClose}
        onLocationSelect={handleDepartureLocationSelect}
        title="출발지 검색"
        placeholder="출발지를 입력해주세요"
      />

      <LocationModal
        isOpen={isDestinationOpen}
        onClose={handleDestinationClose}
        onLocationSelect={handleDestinationLocationSelect}
        title="여행지 검색"
        placeholder="여행지를 입력해주세요"
      />

      <PersonCountModal
        isOpen={isPersonCountOpen}
        onClose={handlePersonCountClose}
        personCount={{adults: info.adultCount, children: info.childCount}}
        onPersonCountChange={handlePersonCountChange}
      />
      
      <TransportModal
        isOpen={isTransportOpen}
        onClose={handleTransportClose}
        selectedTransport={selectedTransport}
        onTransportChange={handleTransportChange}
      />

      {mapModalOpen && <MapModal
        setMapModalOpen={setMapModalOpen}
        schedule={sortedState}
        selectedDay={selectedDay}
      />}

      {isShareOpen && <ShareModal
        isOwner={true}
        setIsShareOpen={setIsShareOpen}
        id={id}
      />}

      <span
        ref={spanRef}
        className="invisible absolute whitespace-pre text-lg font-semibold px-2"
      >
        {title || ' '}
      </span>
    </div>
  )
}

const MapModal = ({setMapModalOpen, schedule, selectedDay}) => {
  useKakaoLoader()

  const [map, setMap] = useState();

  const sortedSchedule = [...schedule[selectedDay]].sort((a, b) =>
    a.timeSlot.localeCompare(b.timeSlot)
  );

  const positions = sortedSchedule.length > 0
  ? sortedSchedule.map(item => ({
      lat: item.yLocation,
      lng: item.xLocation,
    }))
  : [
      { lat: 37.5665, lng: 126.9780 } // 기본 좌표 (예: 서울 시청)
    ];

  // useEffect를 사용하여 map 인스턴스가 생성된 후 한 번만 실행되도록 설정
  useEffect(() => {
    if (!map) return; // map 인스턴스가 아직 생성되지 않았다면 아무것도 하지 않음

    // LatLngBounds 객체에 모든 마커의 좌표를 추가합니다.
    const bounds = new window.kakao.maps.LatLngBounds();
    positions.forEach((pos) => {
      bounds.extend(new window.kakao.maps.LatLng(pos.lat, pos.lng));
    });

    // 계산된 bounds를 지도에 적용합니다.
    map.setBounds(bounds);
  }, [map]); // map 인스턴스가 변경될 때마다 이 useEffect를 다시 실행

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm font-pretendard">
      <div className="w-[1200px] shadow-2xl relative">
        <Map // 지도를 표시할 Container
          id="map"
          className="rounded-2xl"
          center={{
            // 지도의 중심좌표
            lat: 33.452278,
            lng: 126.567803,
          }}
          style={{
            // 지도의 크기
            width: "100%",
            height: "700px",
          }}
          level={3} // 지도의 확대 레벨
          onCreate={setMap}
        >
          {(schedule[selectedDay] || []).map((item, index) => {
            return (
              <MapMarker // 인포윈도우를 생성하고 지도에 표시합니다
                key={item.placeId}
                position={{
                  // 인포윈도우가 표시될 위치입니다
                  lat: item.yLocation,
                  lng: item.xLocation,
                }}
              >
                <div
                  className="p-2 w-[159px]"
                  style={{ borderRadius: "4rem" }}
                >
                  <p className="text-lg font-semibold truncate">
                    {item.name}
                  </p>
                  <div className="flex items-center space-x-1">
                    <div className="text-sm w-[22px] h-[22px] border border-main text-main font-semibold rounded-full flex items-center justify-center">{index+1}</div>
                    <a
                      href={item.url}
                      style={{ color: "blue" }}
                      className="text-sm hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      장소 정보 보기
                    </a>
                  </div>
                </div>
              </MapMarker>
            );
          })}
          {positions.slice(0, -1).map((pos, idx) => {
            return (
              <Polyline
                path={[
                  [
                    pos, 
                    positions[idx + 1],
                  ],
                ]}
                strokeWeight={4} // 선의 두께 입니다
                strokeColor={"#1344FF"} // 선의 색깔입니다
                strokeOpacity={0.5} // 선의 불투명도 입니다 1에서 0 사이의 값이며 0에 가까울수록 투명합니다
                strokeStyle={"arrow"} // 선의 스타일입니다
                endArrow={true}
              />
            )
          })}
        </Map>
        <button
          onClick={() => setMapModalOpen(false)}
          className="absolute shadow-2xl top-6 right-6 z-50 text-2xl w-10 h-10 bg-main/60 hover:bg-[#0E32C5]/60 backdrop-blur-sm text-white rounded-full font-medium transition-all duration-200"
        >
          ×
        </button>
      </div>
    </div>
  )
}