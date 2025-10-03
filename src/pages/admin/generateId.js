// function to generate a unique id for a new  space based on the  space id and space admin name 
export const generateUniqueId = (spaceId, adminName) => {
  const timestamp = Date.now().toString(36);    
    const randomSegment = Math.random().toString(36).substring(2, 8);
    const uniqueId = `${spaceId}-${adminName}-${timestamp}-${randomSegment}`;
    return uniqueId;
  };