const GlassCard = ({ children, className = "", ...props }) => {
  return (
    <div className={`glass rounded-3xl p-6 md:p-8 ${className}`} {...props}>
      {children}
    </div>
  );
};

export default GlassCard;
