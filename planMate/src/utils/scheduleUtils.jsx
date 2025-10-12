// 두 번째 API 응답을 첫 번째 형태로 변환하는 함수
export const transformApiResponse = (apiResponse) => {
  const { placeBlocks, timetables } = apiResponse;
  const result = {};

  // 각 timetable에 대해 빈 배열 초기화
  timetables.forEach((timetable) => {
    result[timetable.timeTableId] = [];
  });

  // placeBlocks를 순회하면서 데이터 변환
  placeBlocks.forEach((place) => {
    // startTime과 endTime으로부터 duration 계산 (15분 단위)
    const startTimeField = place.blockStartTime || place.startTime;
    const endTimeField = place.blockEndTime || place.endTime;
    
    const startTime = new Date(`2000-01-01T${startTimeField}`);
    let endTime;
    if (endTimeField === "23:59:59") {
      endTime = new Date(`2000-01-01T24:00:00`);
    } else {
      endTime = new Date(`2000-01-01T${endTimeField}`);
    }
    const durationMinutes = (endTime - startTime) / (1000 * 60);
    const duration = Math.round(durationMinutes / 15);

    // timeSlot을 HH:MM 형태로 변환
    const timeSlot = startTimeField.substring(0, 5);

    // Google Maps URL에서 placeId 추출
    const urlMatch = place.placeLink.match(/place_id:([^&]+)/);
    const placeId = urlMatch ? urlMatch[1] : "";

    // categoryId에 따른 iconUrl 설정
    let iconUrl;
    const categoryId = place.placeCategory ?? place.placeCategoryId;
    if (categoryId !== undefined) {
      if (categoryId === 0) {
        iconUrl = "https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/park-71.png";
      } else if (categoryId === 1) {
        iconUrl = "https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/lodging-71.png";
      } else {
        iconUrl = "https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/generic_business-71.png";
      }
    } else {
      iconUrl = "https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/generic_business-71.png";
    }

    // 변환된 객체 생성
    const transformedPlace = {
      timetablePlaceBlockId: place.blockId ?? place.timetablePlaceBlockId,
      placeId: placeId,
      url: place.placeLink,
      name: place.placeName,
      formatted_address: place.placeAddress,
      rating: place.placeRating,
      iconUrl: iconUrl,
      categoryId: place.placeCategory ?? place.placeCategoryId,
      xLocation: place.xLocation ?? place.xlocation,
      yLocation: place.yLocation ?? place.ylocation,
      timeSlot: timeSlot,
      duration: duration,
    };

    // 해당하는 timetableId를 찾아서 데이터 추가
    // const placeIndex = placeBlocks.indexOf(place);
    const targetTimetableId = place.timeTableId ?? place.timetableId;

    // if (placeIndex < 4) {
    //   targetTimetableId = timetables[0]?.timetableId || 78;
    // } else if (placeIndex < 7) {
    //   targetTimetableId = timetables[1]?.timetableId || 79;
    // } else {
    //   targetTimetableId = timetables[2]?.timetableId || 80;
    // }

    if (result[targetTimetableId]) {
      result[targetTimetableId].push(transformedPlace);
    }
  });
  return result;
};

// 시간에 분 더하기
export const addMinutes = (time, minsToAdd) => {
  const [hour, min] = time.split(":").map(Number);
  const date = new Date(0, 0, 0, hour, min + minsToAdd);
  return date.toTimeString().slice(0, 5); // "HH:MM"
};

// 시간 겹침 체크 함수
export const checkTimeOverlap = (newItem, timeSlots, daySchedule, excludeId = null) => {
  const newStartIndex = getTimeSlotIndex(newItem.timeSlot, timeSlots);
  const newEndIndex = newStartIndex + newItem.duration - 1;

  return daySchedule.some((item) => {
    if (excludeId && item.placeId === excludeId) return false;

    const existingStartIndex = getTimeSlotIndex(item.timeSlot, timeSlots);
    const existingEndIndex = existingStartIndex + item.duration - 1;

    return !(newEndIndex < existingStartIndex || newStartIndex > existingEndIndex);
  });
};

// 가장 가까운 빈 시간대 찾기
export const findNearestAvailableTime = (preferredTimeSlot, duration, timeSlots, daySchedule) => {
  const preferredIndex = getTimeSlotIndex(preferredTimeSlot, timeSlots);

  // 선호 시간부터 시작해서 아래로 검색
  for (let i = preferredIndex; i <= timeSlots.length - duration; i++) {
    const testItem = { timeSlot: timeSlots[i], duration };
    if (!checkTimeOverlap(testItem, timeSlots, daySchedule)) {
      return timeSlots[i];
    }
  }

  // 위로 검색
  for (let i = preferredIndex - 1; i >= 0; i--) {
    if (i + duration > timeSlots.length) continue;
    const testItem = { timeSlot: timeSlots[i], duration };
    if (!checkTimeOverlap(testItem, timeSlots, daySchedule)) {
      return timeSlots[i];
    }
  }

  return null;
};

// 시간 슬롯 인덱스 가져오기
export const getTimeSlotIndex = (timeSlot, timeSlots) => {
  return timeSlots.indexOf(timeSlot);
};

// 카테고리에 따른 장소 분류
export const getCategoryByIconUrl = (categoryId) => {
  if (categoryId === 0) {
    return "관광지";
  } else if (categoryId === 1) {
    return "숙소";
  } else {
    return "식당";
  }
};