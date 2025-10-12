import { useState } from "react";
import { useDragAndDrop, useTimeSlots } from "../../hooks/useScheduleLogic";
import ScheduleItem from "./ScheduleItem";

const TimeTable = ({ 
  selectedDay, 
  timetables, 
  schedule, 
  places, 
  onScheduleUpdate, 
  onPlacesUpdate 
}) => {
  const [draggedItem, setDraggedItem] = useState(null);
  const [draggedFromSchedule, setDraggedFromSchedule] = useState(null);

  const timeSlots = useTimeSlots(selectedDay, timetables);
  const {
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop
  } = useDragAndDrop({
    selectedDay,
    schedule,
    places,
    timeSlots,
    draggedItem,
    draggedFromSchedule,
    setDraggedItem,
    setDraggedFromSchedule,
    onScheduleUpdate,
    onPlacesUpdate
  });

  // 현재 선택된 날의 종료 시간 가져오기
  const getCurrentEndTime = () => {
    if (!selectedDay || !timetables.length) return "20:00";

    const currentTimetable = timetables.find(
      (t) => t.timeTableId === selectedDay
    );
    return currentTimetable && currentTimetable.timeTableEndTime
      ? currentTimetable.timeTableEndTime.substring(0, 5)
      : "20:00";
  };

  return (
    <div className="w-[450px] h-full">
      <div className="border border-gray-300 bg-white rounded-lg px-5 py-7 relative h-[calc(100vh-189px)] overflow-y-auto">
        <div className="relative border-t border-gray-200">
          {timeSlots.map((time, index) => (
            <div
              key={time}
              className="flex items-center relative border-b border-gray-200 hover:bg-gray-50"
              style={{ height: "30px", minHeight: "30px" }}
              onDrop={(e) => handleDrop(e, time)}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="w-10 text-xs text-gray-500 absolute top-[-25%] bg-white z-20">
                {time}
              </div>
              {index + 1 === timeSlots.length ? (
                <div className="w-10 text-xs text-gray-500 absolute bottom-[-30%] bg-white z-20">
                  {getCurrentEndTime()}
                </div>
              ) : null}
              <div
                className="flex-1 h-full relative"
                style={{ minHeight: "30px" }}
              ></div>
            </div>
          ))}

          {/* 스케줄 아이템들 */}
          {(schedule[selectedDay] || []).map((item) => (
            <ScheduleItem
              key={item.placeId}
              item={item}
              timeSlots={timeSlots}
              schedule={schedule}
              selectedDay={selectedDay}
              places={places}
              onScheduleUpdate={onScheduleUpdate}
              onPlacesUpdate={onPlacesUpdate}
              onDragStart={(e, item) => handleDragStart(e, item, true)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimeTable;