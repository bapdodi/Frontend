import { faCalendarDays } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import { createPortal } from "react-dom";

const DaySelector = ({ timetables, timeDispatch, selectedDay, onDaySelect, stompClientRef, id, schedule }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 날짜 포맷팅 함수
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${month}.${day}.`;
  };

  return (
    <>
      <div className="flex flex-col space-y-4">
        {timetables.map((timetable, index) => (
          <button
            key={timetable.timeTableId}
            className={`px-4 py-4 rounded-lg ${
              selectedDay === timetable.timeTableId
                ? "bg-main text-white"
                : "bg-white text-gray-700 border border-gray-300"
            }`}
            onClick={() => onDaySelect(timetable.timeTableId)}
          >
            <div className="text-xl font-semibold">
              {index+1}일차
            </div>
            <div className="text-sm">{formatDate(timetable.date)}</div>
          </button>
        ))}
        <button 
          className="text-2xl text-gray-500 hover:text-gray-700"
          onClick={() => setIsModalOpen(true)}
        >
          <FontAwesomeIcon icon={faCalendarDays} />
        </button>
      </div>
      {isModalOpen && createPortal(
        <Modal 
          setIsModalOpen={setIsModalOpen} 
          timetables={timetables} 
          timeDispatch={timeDispatch} 
          stompClientRef={stompClientRef} 
          id={id} 
          onDaySelect={onDaySelect} 
          selectedDay={selectedDay}
          schedule={schedule}
        />,
        document.body
      )}
    </>
  );
};

const Modal = ({ setIsModalOpen, timetables, timeDispatch, stompClientRef, id, selectedDay, onDaySelect, schedule }) => {
  const [newTime, setNewTime] = useState(timetables);

  const [create, setCreate] = useState({"timeTableDtos": []});
  const [update, setUpdate] = useState({"timeTableDtos": []});
  const [deleteTime, setDelete] = useState({"timeTableDtos": []});

  const times = [];
  for (let h = 0; h < 25; h++) {
    for (let m = 0; m < 60; m += 60) {
      const formatted = `${String(h).padStart(2, "0")}:${String(m).padStart(
        2,
        "0"
      )}:00`;
      times.push(formatted);
    }
  }

  const updateDate = (e) => {
    if (e.target.value) {
      const baseDate = new Date(e.target.value);

      const updatedTimes = newTime.map((item, index) => {
        const newDate = new Date(baseDate);
        newDate.setDate(baseDate.getDate() + index);
        return { ...item, date: newDate.toISOString().split("T")[0] };
      });

      setNewTime(updatedTimes);

      setUpdate(prev => ({
        ...prev,
        timeTableDtos: updatedTimes
      }));
    }
  };

  const updateTime = (e, index, timeTableId, se) => {
    const baseTime = e.target.value;
    let updatedTimes = null;

    if (se == "start") {
      updatedTimes = newTime.map((item, i) =>
        i === index ? { ...item, timeTableStartTime: baseTime } : item
      )
    } else if (se == "end") {
      updatedTimes = newTime.map((item, i) =>
        i === index ? { ...item, timeTableEndTime: baseTime } : item
      )
    }

    setNewTime(updatedTimes);

    if (timeTableId < 1 && timeTableId >= 0) {
      setCreate((prev) => ({
        ...prev, // 기존 객체 속성 유지
        timeTableDtos: prev.timeTableDtos.map((item) =>
          item.timeTableId === timeTableId ? updatedTimes[index] : item
        )
      }));
    } else {
      setUpdate(prev => ({
        ...prev,
        timeTableDtos: updatedTimes
      }));
    }
  }

  const addDay = () => {
    const lastDateStr = newTime[newTime.length - 1].date;
    const lastDate = new Date(lastDateStr);
    lastDate.setDate(lastDate.getDate() + 1);
    const newDate = lastDate.toISOString().split('T')[0];
    const newId = Math.random()

    const timetableVO = {
      timeTableId: newId,
      date: newDate,
      timeTableStartTime: "09:00:00",
      timeTableEndTime: "20:00:00",
      planId: parseInt(id),  // planId 추가
    }

    setNewTime((prev) => [...prev, timetableVO])

    setCreate((prev) => ({
      ...prev,
      timeTableDtos: [
        ...prev.timeTableDtos,
        timetableVO
      ]
    }))

    setDelete(prev => ({
      ...prev,
      timeTableDtos: prev.timeTableDtos.filter(item => item.timeTableId !== newId)
    }));
  }

  const deleteDay = () => {
    setNewTime((prev) => {
      if (prev.length <= 1) return prev;

      const newArr = [...prev];
      const lastElement = newArr.pop();  // 마지막 요소 제거 및 저장
      
      setCreate(prev => ({
        ...prev,
        timeTableDtos: prev.timeTableDtos.filter(item => item.timeTableId !== lastElement.timeTableId)
      }));

      setDelete((prev2) => ({
        ...prev2,
        timeTableDtos: [
          ...prev2.timeTableDtos,
          { timeTableId: lastElement.timeTableId }
        ]
      }))

      return newArr;
    });
  }

  const hasOutOfRange = (schedule, newTime) => {
    const toMinutes = (timeStr) => {
      const [h, m] = timeStr.split(":").map(Number);
      return h * 60 + m;
    };

    return newTime.some(({ timeTableId, timeTableStartTime, timeTableEndTime }) => {
      const places = schedule[timeTableId];
      if (!places || places.length === 0) return false;

      const startMin = toMinutes(timeTableStartTime);
      const endMin = toMinutes(timeTableEndTime);

      return places.some((place) => {
        const placeStartMin = toMinutes(place.timeSlot);
        const placeEndMin = placeStartMin + place.duration * 15;
        return placeStartMin < startMin || placeEndMin > endMin;
      });
    });
  }

  const handleComfirm = () => {
    const isInvalid = newTime.some(item => item.timeTableStartTime >= item.timeTableEndTime);
    
    if (isInvalid) {
      alert("시작 시간이 종료 시간과 같거나 큰 항목이 있습니다.");
      return;
    }

    if (hasOutOfRange(schedule, newTime)) {
      alert("변경하려는 시간이 블록과 충돌합니다.");
      return;
    }

    const client = stompClientRef.current;

    if (client && client.connected) {
      if (create.timeTableDtos && create.timeTableDtos.length > 0) {
        const payload = {
          entity: "timetable",
          action: "create",
          ...create
        };
        console.log("🚀 타임테이블 생성 전송:", payload);
        client.publish({
          destination: `/app/${id}`,
          body: JSON.stringify(payload),
        });
      }
      
      if (update.timeTableDtos && update.timeTableDtos.length > 0) {
        const payload = {
          entity: "timetable",
          action: "update",
          ...update
        };
        console.log("🚀 타임테이블 업데이트 전송:", payload);
        client.publish({
          destination: `/app/${id}`,
          body: JSON.stringify(payload),
        });
      }
      
      if (deleteTime.timeTableDtos && deleteTime.timeTableDtos.length > 0) {
        const payload = {
          entity: "timetable",
          action: "delete",
          ...deleteTime
        };
        console.log("🚀 타임테이블 삭제 전송:", payload);
        client.publish({
          destination: `/app/${id}`,
          body: JSON.stringify(payload),
        });
      }
      
      timeDispatch({type: "update", payload: newTime});
      
      const dateId = newTime.map((t) => t.timeTableId)
      if (!dateId.includes(selectedDay)) {
        onDaySelect(dateId[dateId.length - 1]);
      }

      setIsModalOpen(false);
    } else {
      console.error("❌ WebSocket이 연결되지 않았습니다.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm font-pretendard"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white p-6 rounded-2xl shadow-2xl border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-2">일정 변경</h2>
        <div className="my-5 max-h-[calc(100vh-300px)] overflow-auto">
          <div className="divide-y">
            <div className="space-x-3 py-2 grid grid-cols-[1fr_3fr_3fr_3fr] gap-4 items-center text-sm text-gray-500">
              <div>일차</div>
              <div>날짜</div>
              <div>시작 시간</div>
              <div>종료 시간</div>
            </div>
            {newTime.map((timetable, index) => {
              if (index == 0) {
                return (
                  <div 
                    key={timetable.timeTableId}
                    className="space-x-3 py-2 grid grid-cols-[1fr_3fr_3fr_3fr] gap-4 items-center"
                  >
                    <div>{index+1}일차</div>
                    <input
                      type="date"
                      value={timetable.date}
                      className="border rounded-lg px-2 h-11"
                      onChange={updateDate}
                    />
                    <select
                      value={timetable.timeTableStartTime}
                      onChange={(e) => updateTime(e, index, timetable.timeTableId, "start")}
                      className="border rounded-lg px-2 h-11"
                    >
                      {times.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <select
                      value={timetable.timeTableEndTime}
                      onChange={(e) => updateTime(e, index, timetable.timeTableId, "end")}
                      className="border rounded-lg px-2 h-11"
                    >
                      {times.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              } else {
                return (
                  <div 
                    key={timetable.timeTableId}
                    className="space-x-3 py-2 grid grid-cols-[1fr_3fr_3fr_3fr] gap-4 items-center"
                  >
                    <div>{index+1}일차</div>
                    <div>{timetable.date}</div>
                    <select
                      value={timetable.timeTableStartTime}
                      onChange={(e) => updateTime(e, index, timetable.timeTableId, "start")}
                      className="border rounded-lg px-2 h-11"
                    >
                      {times.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <select
                      value={timetable.timeTableEndTime}
                      onChange={(e) => updateTime(e, index, timetable.timeTableId, "end")}
                      className="border rounded-lg px-2 h-11"
                    >
                      {times.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              }
            })}
            <div className="py-3 space-x-2 text-end">
              <button onClick={() => deleteDay()} className="w-8 h-8 rounded bg-gray-200 hover:bg-gray-300 text-xl">-</button>
              <button onClick={() => addDay()} className="w-8 h-8 rounded bg-gray-200 hover:bg-gray-300 text-xl">+</button>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => setIsModalOpen(false)}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200"
          >
            취소
          </button>
          <button
            className="px-4 py-2.5 bg-main text-white rounded-xl font-medium transition-all duration-200 shadow-sm"
            onClick={() => handleComfirm()}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};


export default DaySelector;