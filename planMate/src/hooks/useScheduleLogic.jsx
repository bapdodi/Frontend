import { useMemo } from "react";
import {
    checkTimeOverlap,
    findNearestAvailableTime
} from "../utils/scheduleUtils";

// 시간 슬롯 계산 훅
export const useTimeSlots = (selectedDay, timetables) => {
  return useMemo(() => {
    if (!selectedDay || !timetables.length) {
      return [];
    }

    const currentTimetable = timetables.find(
      (t) => t.timeTableId === selectedDay
    );
    
    if (!currentTimetable) {
      return [];
    }

    const startHour = parseInt(currentTimetable.timeTableStartTime.split(":")[0]);
    const endHour = parseInt(currentTimetable.timeTableEndTime.split(":")[0]);

    const timeSlots = [];
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        timeSlots.push(
          `${hour.toString().padStart(2, "0")}:${minute
            .toString()
            .padStart(2, "0")}`
        );
      }
    }
    
    return timeSlots;
  }, [selectedDay, timetables]);
};

// 드래그 앤 드롭 로직 훅
export const useDragAndDrop = ({
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
}) => {
  const handleDragStart = (e, item, fromSchedule = false) => {
    setDraggedItem(item);
    setDraggedFromSchedule(fromSchedule);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    e.currentTarget.style.backgroundColor = "#f0f8ff";
  };

  const handleDragLeave = (e) => {
    e.currentTarget.style.backgroundColor = "";
  };

  const handleDrop = (e, targetTimeSlot) => {
    e.preventDefault();
    e.currentTarget.style.backgroundColor = "";

    let draggedItemData;
    
    // 드래그된 데이터 가져오기
    if (draggedItem) {
      draggedItemData = draggedItem;
    } else {
      // dataTransfer에서 데이터 가져오기 (추천 장소에서 드래그된 경우)
      try {
        const dataString = e.dataTransfer.getData("application/json");
        if (dataString) {
          draggedItemData = JSON.parse(dataString);
        }
      } catch (error) {
        console.error("드래그 데이터 파싱 오류:", error);
        return;
      }
    }

    if (!draggedItemData) return;

    // 마우스 위치를 기반으로 더 정확한 시간 슬롯 계산
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const slotHeight = 30;
    const additionalSlots = Math.floor(relativeY / slotHeight);

    const targetIndex = timeSlots.indexOf(targetTimeSlot);
    const actualTargetIndex = Math.min(
      targetIndex + additionalSlots,
      timeSlots.length - 1
    );
    const actualTimeSlot = timeSlots[actualTargetIndex];

    const newSchedule = { ...schedule };
    const daySchedule = newSchedule[selectedDay] || [];

    if (draggedFromSchedule && draggedItem) {
      // 스케줄 내에서 이동
      const originalItem = daySchedule.find(
        (item) => item.placeId === draggedItem.placeId
      );
      if (!originalItem) return;

      const testItem = { ...originalItem, timeSlot: actualTimeSlot };

      if (checkTimeOverlap(testItem, timeSlots, daySchedule, draggedItem.placeId)) {
        const availableTime = findNearestAvailableTime(
          actualTimeSlot,
          originalItem.duration,
          timeSlots,
          daySchedule
        );
        if (availableTime) {
          testItem.timeSlot = availableTime;
        } else {
          setDraggedItem(null);
          setDraggedFromSchedule(null);
          return;
        }
      }

      newSchedule[selectedDay] = daySchedule.filter(
        (item) => item.placeId !== draggedItem.placeId
      );
      newSchedule[selectedDay].push(testItem);
    } else {
      // 추천 탭에서 스케줄로 이동
      const newPlaces = { ...places };
      const category = Object.keys(newPlaces).find((key) =>
        newPlaces[key].some((place) => place.placeId === draggedItemData.placeId)
      );

      if (category) {
        const newItem = {
          ...draggedItemData,
          timeSlot: actualTimeSlot,
          duration: 4, // 기본 1시간
        };

        if (checkTimeOverlap(newItem, timeSlots, daySchedule)) {
          const availableTime = findNearestAvailableTime(
            actualTimeSlot,
            newItem.duration,
            timeSlots,
            daySchedule
          );
          if (availableTime) {
            newItem.timeSlot = availableTime;
          } else {
            setDraggedItem(null);
            setDraggedFromSchedule(null);
            return;
          }
        }

        newPlaces[category] = newPlaces[category].filter(
          (place) => place.placeId !== draggedItemData.placeId
        );
        onPlacesUpdate(newPlaces);
        
        if (!newSchedule[selectedDay]) {
          newSchedule[selectedDay] = [];
        }
        newSchedule[selectedDay].push(newItem);
      }
    }

    onScheduleUpdate(newSchedule);
    setDraggedItem(null);
    setDraggedFromSchedule(null);
  };

  return {
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop
  };
};
      