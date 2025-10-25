import { motion } from "framer-motion";

interface TypingIndicatorProps {
  userName?: string;
  className?: string;
}

export function TypingIndicator({ userName = "Someone", className = "" }: TypingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex justify-start ${className}`}
    >
      <div className="bg-muted text-foreground rounded-lg px-3 py-2 max-w-[75%]">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-muted-foreground">{userName} is typing</span>
          <div className="flex space-x-1">
            <motion.div
              className="w-1.5 h-1.5 bg-muted-foreground rounded-full"
              animate={{
                y: [0, -4, 0],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="w-1.5 h-1.5 bg-muted-foreground rounded-full"
              animate={{
                y: [0, -4, 0],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.1,
              }}
            />
            <motion.div
              className="w-1.5 h-1.5 bg-muted-foreground rounded-full"
              animate={{
                y: [0, -4, 0],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.2,
              }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}